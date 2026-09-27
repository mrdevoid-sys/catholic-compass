import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

type Tab = 'discover' | 'route' | 'saved' | 'journal';
type Category = 'Shrines' | 'Churches' | 'Basilicas' | 'Latin Mass' | 'Monasteries' | 'Pilgrimage' | 'Relics';
type Filter = 'All places' | Category | 'Source checked' | 'Route ready';
type Verification = 'Source checked' | 'Community listing';
type Confidence = 'precise' | 'approximate';

type Coordinates = {latitude: number; longitude: number};

type Place = {
  id: string;
  name: string;
  city: string;
  region: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  confidence: Confidence;
  categories: Category[];
  verification: Verification;
  description: string;
  website?: string;
  phone?: string;
  scheduleNote?: string;
  sourceNote: string;
};

type SuggestedStop = Place & {distanceFromRouteMiles: number};

type RouteResult = {
  fromLabel: string;
  toLabel: string;
  distanceMiles: number;
  durationMinutes: number;
  coordinates: Coordinates[];
  stops: SuggestedStop[];
};

type SavedTrip = {
  id: string;
  name: string;
  from: string;
  to: string;
  distanceMiles: number;
  durationMinutes: number;
  stopIds: string[];
  createdAt: string;
};

type StoredState = {
  savedIds: string[];
  selectedStopIds: string[];
  trips: SavedTrip[];
  journal: Record<string, string>;
};

const STORAGE_KEY = 'catholic-compass-mobile:v4';
const MILES_PER_METER = 0.000621371;
const CATALOG_TOTAL = 604;
const MAPPED_TOTAL = 603;
const LATIN_MASS_TOTAL = 462;
const SOURCE_CHECKED_TOTAL = 17;

const colors = {
  ink: '#221d17',
  coal: '#141713',
  muted: '#776d60',
  green: '#123d34',
  green2: '#1e594c',
  green3: '#dce9df',
  ivory: '#fbf6ea',
  paper: '#f5ecd9',
  card: '#fffdf7',
  line: '#ded1ba',
  gold: '#b98634',
  gold2: '#ecd9a8',
  oxblood: '#762d2d',
  sky: '#efe2c7',
  hill: '#7d8b63',
  deepHill: '#304c3f'
};

const FILTERS: Filter[] = ['All places', 'Shrines', 'Churches', 'Basilicas', 'Relics', 'Latin Mass', 'Monasteries', 'Pilgrimage', 'Source checked'];

const THEMES = [
  {title: 'Marian shrines', body: 'Places of pilgrimage, devotion, and quiet intercession.', icon: 'sparkles-outline' as const, filter: 'Shrines' as Filter},
  {title: 'Historic churches', body: 'Cathedrals, basilicas, and parish churches with source links.', icon: 'business-outline' as const, filter: 'Churches' as Filter},
  {title: 'Monasteries', body: 'Communities and grounds suited to silence and recollection.', icon: 'leaf-outline' as const, filter: 'Monasteries' as Filter},
  {title: 'Traditional liturgy', body: 'Imported listings kept separate until venue details are checked.', icon: 'flame-outline' as const, filter: 'Latin Mass' as Filter}
];

const PLACES: Place[] = [
  place('st-leonard-boston', "St. Leonard's Church", 'Boston', 'MA', 'North End', '320 Hanover St, Boston, MA 02113', 42.3638, -71.0549, ['Churches'], 'Source checked', 'A historic Catholic parish in Boston\'s North End, included with source links for travelers exploring the city.', 'https://saintleonardchurchboston.org/'),
  place('perpetual-help-boston', 'Basilica of Our Lady of Perpetual Help', 'Boston', 'MA', 'Roxbury', '1545 Tremont St, Boston, MA 02120', 42.3332, -71.1002, ['Basilicas', 'Churches'], 'Source checked', 'A Boston basilica and parish church known locally as Mission Church.', 'https://www.bostonsbasilica.com/'),
  place('divine-mercy-stockbridge', 'National Shrine of The Divine Mercy', 'Stockbridge', 'MA', 'Stockbridge', '2 Prospect Hill Rd, Stockbridge, MA 01262', 42.3042, -73.3396, ['Shrines', 'Pilgrimage'], 'Source checked', 'A pilgrimage shrine in Stockbridge, Massachusetts, cared for by the Marian Fathers and dedicated to the message of Divine Mercy.', 'https://shrineofdivinemercy.org/'),
  place('st-patrick-nyc', "St. Patrick's Cathedral", 'New York', 'NY', 'New York', '5th Ave, New York, NY 10022', 40.7585, -73.976, ['Churches', 'Pilgrimage'], 'Source checked', 'A landmark Catholic cathedral in New York City.', 'https://saintpatrickscathedral.org/'),
  place('immaculate-conception-dc', 'Basilica of the National Shrine of the Immaculate Conception', 'Washington', 'DC', 'Washington', '400 Michigan Ave NE, Washington, DC 20017', 38.9334, -77.0007, ['Shrines', 'Basilicas', 'Pilgrimage'], 'Source checked', 'A major Catholic shrine and basilica dedicated to the Blessed Virgin Mary under the title of the Immaculate Conception.', 'https://www.nationalshrine.org/'),
  place('shrine-st-joseph-st-louis', 'Shrine of St. Joseph', 'St. Louis', 'MO', 'St. Louis', '1220 N 11th St, St. Louis, MO 63106', 38.6417, -90.1923, ['Shrines', 'Churches'], 'Source checked', 'A historic Catholic shrine in St. Louis.', 'https://www.shrineofstjoseph.org/'),
  place('cathedral-basilica-st-louis', 'Cathedral Basilica of St. Louis', 'St. Louis', 'MO', 'St. Louis', '4431 Lindell Blvd, St. Louis, MO 63108', 38.6421, -90.2547, ['Basilicas', 'Churches'], 'Source checked', 'A cathedral basilica in St. Louis noted for its sacred architecture and mosaics.', 'https://cathedralstl.org/'),
  place('mission-san-juan-capistrano', 'Mission San Juan Capistrano', 'San Juan Capistrano', 'CA', 'San Juan Capistrano', '26801 Old Mission Rd, San Juan Capistrano, CA 92675', 33.5017, -117.6626, ['Churches', 'Pilgrimage'], 'Source checked', 'A historic California mission and Catholic heritage site.', 'https://www.missionsjc.com/'),
  place('mission-carmel', 'Mission San Carlos Borromeo de Carmelo', 'Carmel-by-the-Sea', 'CA', 'Carmel-by-the-Sea', '3080 Rio Rd, Carmel-By-The-Sea, CA 93923', 36.5421, -121.9204, ['Churches', 'Pilgrimage'], 'Source checked', 'A historic California mission associated with St. Junipero Serra.', 'https://carmelmission.org/'),
  place('cathedral-st-paul', 'Cathedral of St. Paul', 'St. Paul', 'MN', 'St. Paul', '239 Selby Ave, St Paul, MN 55102', 44.9469, -93.1086, ['Churches', 'Pilgrimage'], 'Source checked', 'The cathedral church of Saint Paul, Minnesota, overlooking the city.', 'https://www.cathedralsaintpaul.org/'),
  place('mission-san-xavier', 'Mission San Xavier del Bac', 'Tucson', 'AZ', 'Tucson', '1950 W San Xavier Rd, Tucson, AZ 85746', 32.107, -111.0079, ['Churches', 'Pilgrimage'], 'Source checked', 'A historic Catholic mission south of Tucson.', 'https://sanxaviermission.org/'),
  place('cathedral-savannah', 'Cathedral of St. John the Baptist', 'Savannah', 'GA', 'Savannah', '222 E Harris St, Savannah, GA 31401', 32.0731, -81.0916, ['Churches'], 'Source checked', 'The cathedral church in Savannah, Georgia.', 'https://savannahcathedral.org/'),
  place('seton-shrine', 'National Shrine of St. Elizabeth Ann Seton', 'Emmitsburg', 'MD', 'Emmitsburg', '339 S Seton Ave, Emmitsburg, MD 21727', 39.7015, -77.3252, ['Shrines', 'Pilgrimage'], 'Source checked', 'A national shrine honoring St. Elizabeth Ann Seton.', 'https://setonshrine.org/'),
  place('lasalette-attleboro', 'Shrine of Our Lady of La Salette', 'Attleboro', 'MA', 'Attleboro', '947 Park St, Attleboro, MA 02703', 41.9434, -71.2617, ['Shrines', 'Pilgrimage'], 'Source checked', 'A Marian shrine in Attleboro, Massachusetts.', 'https://lasaletteattleboroshrine.org/'),
  place('holy-hill', 'Holy Hill National Shrine of Mary', 'Hubertus', 'WI', 'Hubertus', '1525 Carmel Rd, Hubertus, WI 53033', 43.2424, -88.3261, ['Shrines', 'Basilicas', 'Pilgrimage'], 'Source checked', 'A basilica and national shrine in Wisconsin served by Discalced Carmelites.', 'https://www.holyhill.com/'),
  place('saint-francis-lincoln', 'Saint Francis of Assisi Church', 'Lincoln', 'NE', 'Lincoln', '1145 South St, Lincoln, NE 68502', 40.7911, -96.7064, ['Latin Mass', 'Churches'], 'Source checked', 'A Catholic church listing associated with traditional liturgy travelers. Check the parish source for current schedules.', undefined, 'Check official sources before travelling for Mass times.'),
  place('our-lady-guadalupe-la-crosse', 'Shrine of Our Lady of Guadalupe', 'La Crosse', 'WI', 'La Crosse', '5250 Justin Rd, La Crosse, WI 54601', 43.7451, -91.2063, ['Shrines', 'Pilgrimage'], 'Source checked', 'A Marian shrine in La Crosse, Wisconsin.', 'https://guadalupeshrine.org/'),
  place('cathedral-holy-cross-boston', 'Cathedral of the Holy Cross', 'Boston', 'MA', 'Boston', '1400 Washington St, Boston, MA 02118', 42.3416, -71.0708, ['Churches'], 'Community listing', 'The cathedral church of the Archdiocese of Boston. Details are preserved as a community listing until fully reviewed.', 'https://holycrossboston.com/'),
  place('christ-king-chicago', 'Shrine of Christ the King', 'Chicago', 'IL', 'Chicago', '6415 S Woodlawn Ave, Chicago, IL 60637', 41.7785, -87.5962, ['Shrines', 'Latin Mass'], 'Community listing', 'A Catholic shrine listing in Chicago. Confirm current status, access, and liturgical schedule from official sources.', 'https://www.institute-christ-king.org/chicago-home'),
  place('sacred-heart-dc', 'Shrine of the Sacred Heart', 'Washington', 'DC', 'Washington', '3211 Sacred Heart Way NW, Washington, DC 20010', 38.9327, -77.0364, ['Shrines', 'Churches'], 'Community listing', 'A Catholic shrine parish listing in Washington, DC.', 'https://sacredheartdc.org/'),
  place('guadalupe-santa-fe', 'Shrine of Our Lady of Guadalupe', 'Santa Fe', 'NM', 'Santa Fe', '417 Agua Fria St, Santa Fe, NM 87501', 35.687, -105.9451, ['Shrines'], 'Community listing', 'A shrine listing in Santa Fe retained with community-listing status.', 'https://santuariodeguadalupesantafe.com/'),
  place('st-anne-beaupre', 'Shrine of St. Anne', 'Beaupre', 'QC', 'Beaupre', '10018 Ave Royale, Sainte-Anne-de-Beaupre, QC G0A 3C0', 47.0235, -70.929, ['Shrines', 'Basilicas', 'Pilgrimage'], 'Community listing', 'A Canadian shrine listing retained for pilgrimage planning. Confirm current details from official sources.', 'https://sanctuairesainteanne.org/'),
  place('grotto-lourdes-emmitsburg', 'Grotto of Our Lady of Lourdes', 'Emmitsburg', 'MD', 'Emmitsburg', '16330 Grotto Rd, Emmitsburg, MD 21727', 39.6824, -77.3497, ['Shrines', 'Pilgrimage'], 'Community listing', 'A shrine and grotto listing near Emmitsburg, Maryland.', 'https://www.nsgrotto.org/'),
  place('cathedral-st-augustine', 'Cathedral of St. Augustine', 'St. Augustine', 'FL', 'St. Augustine', '38 Cathedral Pl, St. Augustine, FL 32084', 29.8949, -81.3135, ['Churches'], 'Community listing', 'The cathedral parish in historic St. Augustine, Florida.', 'https://thefirstparish.org/'),
  place('st-john-cantius', 'St. John Cantius Church', 'Chicago', 'IL', 'Chicago', '825 N Carpenter St, Chicago, IL 60642', 41.8975, -87.6535, ['Churches', 'Latin Mass'], 'Community listing', 'A Chicago Catholic church widely associated with sacred liturgy and traditional Catholic devotion.', 'https://www.cantius.org/', 'Check the parish source for current Mass times.'),
  place('st-mary-pine-bluff', 'St. Mary of Pine Bluff Catholic Church', 'Cross Plains', 'WI', 'Pine Bluff', '3673 County Road P, Cross Plains, WI 53528', 43.0607, -89.6648, ['Churches', 'Latin Mass'], 'Community listing', 'A parish listing preserved for travelers seeking traditional liturgy; current schedules require source confirmation.', 'https://stmarypinebluff.com/', 'Check the parish website for current times.'),
  place('hanceville-shrine', 'Shrine of the Most Blessed Sacrament', 'Hanceville', 'AL', 'Hanceville', '3222 County Road 548, Hanceville, AL 35077', 34.0608, -86.7671, ['Shrines', 'Monasteries', 'Pilgrimage'], 'Source checked', 'A shrine and monastic pilgrimage destination in Alabama associated with the Poor Clares of Perpetual Adoration.', 'https://www.olamshrine.com/'),
  place('champion-shrine', 'National Shrine of Our Lady of Champion', 'Champion', 'WI', 'Champion', '4047 Chapel Dr, Champion, WI 54229', 44.5884, -87.7733, ['Shrines', 'Pilgrimage'], 'Source checked', 'A Marian shrine in Wisconsin known as the National Shrine of Our Lady of Champion.', 'https://championshrine.org/'),
  place('st-cecilia-omaha', 'St. Cecilia Cathedral', 'Omaha', 'NE', 'Omaha', '701 N 40th St, Omaha, NE 68131', 41.2658, -95.9726, ['Churches'], 'Source checked', 'The cathedral church of Omaha, included as a route-ready Catholic destination for Nebraska travelers.', 'https://stceciliacathedral.org/'),
  place('dowd-chapel-boystown', 'Dowd Memorial Chapel of the Immaculate Conception', 'Boys Town', 'NE', 'Boys Town', '13943 Dowd Dr, Boys Town, NE 68010', 41.2604, -96.1312, ['Churches', 'Pilgrimage'], 'Community listing', 'A Catholic chapel listing near Omaha. Coordinates are approximate and practical details should be confirmed before visiting.', 'https://www.boystown.org/', undefined, 'Community listing; location is approximate and should be treated as a travel aid.', 'approximate')
];

function place(
  id: string,
  name: string,
  city: string,
  region: string,
  area: string,
  address: string,
  latitude: number,
  longitude: number,
  categories: Category[],
  verification: Verification,
  description: string,
  website?: string,
  scheduleNote?: string,
  sourceNote = verification === 'Source checked' ? 'Source link retained. Check official sources before travelling for current hours and schedules.' : 'Imported or community listing. Catholic Compass does not claim schedules are current until reviewed from official sources.',
  confidence: Confidence = 'precise'
): Place {
  return {id, name, city, region, area, address, latitude, longitude, confidence, categories, verification, description, website, scheduleNote, sourceNote};
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(place: Place, query: string, filter: Filter) {
  const q = normalize(query);
  const haystack = normalize([place.name, place.city, place.region, place.area, place.address, place.description, place.categories.join(' ')].join(' '));
  const queryMatches = !q || q.split(/\s+/).every((term) => haystack.includes(term));
  const filterMatches = filter === 'All places' || (filter === 'Source checked' ? place.verification === 'Source checked' : filter === 'Route ready' ? true : place.categories.includes(filter as Category));
  return queryMatches && filterMatches;
}

function haversineMiles(a: Coordinates, b: Coordinates) {
  const radiusMiles = 3958.8;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
}

function pointToSegmentMiles(point: Coordinates, a: Coordinates, b: Coordinates) {
  const meanLat = ((a.latitude + b.latitude + point.latitude) / 3) * Math.PI / 180;
  const x1 = a.longitude * Math.cos(meanLat);
  const y1 = a.latitude;
  const x2 = b.longitude * Math.cos(meanLat);
  const y2 = b.latitude;
  const xp = point.longitude * Math.cos(meanLat);
  const yp = point.latitude;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const denom = dx * dx + dy * dy;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, ((xp - x1) * dx + (yp - y1) * dy) / denom));
  const projected = {latitude: y1 + t * dy, longitude: (x1 + t * dx) / Math.cos(meanLat)};
  return haversineMiles(point, projected);
}

function distanceFromPolylineMiles(point: Coordinates, route: Coordinates[]) {
  if (route.length < 2) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length - 1; i += 1) best = Math.min(best, pointToSegmentMiles(point, route[i], route[i + 1]));
  return best;
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} min`;
  return `${hours} hr ${mins} min`;
}

async function geocode(query: string): Promise<Coordinates> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us,ca&q=${encodeURIComponent(query)}`, {headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error('The geocoding service did not respond.');
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error(`I could not locate "${query}". Try adding the state or ZIP code.`);
  const latitude = Number(rows[0].lat);
  const longitude = Number(rows[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error(`The location result for "${query}" was not usable.`);
  return {latitude, longitude};
}

async function getRoadRoute(from: Coordinates, to: Coordinates) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('The road-routing service did not respond.');
  const json = await response.json();
  const route = json?.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!route || !Array.isArray(coords) || coords.length < 2) throw new Error('No road route was returned for those locations.');
  return {
    distanceMiles: route.distance * MILES_PER_METER,
    durationMinutes: route.duration / 60,
    coordinates: coords.map(([longitude, latitude]: [number, number]) => ({latitude, longitude})) as Coordinates[]
  };
}

export default function App() {
  const [tab, setTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All places');
  const [selected, setSelected] = useState<Place | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [journal, setJournal] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState('Portland, Maine');
  const [destination, setDestination] = useState('Omaha, Nebraska');
  const [corridor, setCorridor] = useState(25);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const state = JSON.parse(raw) as Partial<StoredState>;
      setSavedIds(state.savedIds ?? []);
      setSelectedStopIds(state.selectedStopIds ?? []);
      setTrips(state.trips ?? []);
      setJournal(state.journal ?? {});
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({savedIds, selectedStopIds, trips, journal} satisfies StoredState)).catch(() => undefined);
  }, [savedIds, selectedStopIds, trips, journal]);

  const filteredPlaces = useMemo(() => PLACES.filter((placeItem) => matches(placeItem, query, filter)), [filter, query]);
  const savedPlaces = useMemo(() => PLACES.filter((placeItem) => savedIds.includes(placeItem.id)), [savedIds]);
  const selectedStops = useMemo(() => PLACES.filter((placeItem) => selectedStopIds.includes(placeItem.id)), [selectedStopIds]);

  const toggleSaved = (placeItem: Place) => setSavedIds((ids) => ids.includes(placeItem.id) ? ids.filter((id) => id !== placeItem.id) : [placeItem.id, ...ids]);
  const toggleStop = (placeItem: Place) => setSelectedStopIds((ids) => ids.includes(placeItem.id) ? ids.filter((id) => id !== placeItem.id) : [...ids, placeItem.id]);

  const planRoute = async () => {
    setRouting(true);
    setRouteError('');
    try {
      const [fromCoord, toCoord] = await Promise.all([geocode(origin), geocode(destination)]);
      const road = await getRoadRoute(fromCoord, toCoord);
      const stops = PLACES.map((placeItem) => ({...placeItem, distanceFromRouteMiles: distanceFromPolylineMiles({latitude: placeItem.latitude, longitude: placeItem.longitude}, road.coordinates)}))
        .filter((placeItem) => placeItem.distanceFromRouteMiles <= corridor)
        .sort((a, b) => a.distanceFromRouteMiles - b.distanceFromRouteMiles);
      setRoute({fromLabel: origin, toLabel: destination, distanceMiles: road.distanceMiles, durationMinutes: road.durationMinutes, coordinates: road.coordinates, stops});
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : 'Route planning failed. Check your connection and try again.');
    } finally {
      setRouting(false);
    }
  };

  const saveTrip = () => {
    if (!route) return;
    const trip = {id: `trip-${Date.now()}`, name: `${route.fromLabel} to ${route.toLabel}`, from: route.fromLabel, to: route.toLabel, distanceMiles: route.distanceMiles, durationMinutes: route.durationMinutes, stopIds: selectedStopIds, createdAt: new Date().toISOString()};
    setTrips((current) => [trip, ...current]);
    Alert.alert('Pilgrimage saved', 'Your journey has been saved on this device.');
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {tab === 'discover' && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
            <AppMasthead onPlan={() => setTab('route')} />
            <ThemeStrip onSelect={(next) => setFilter(next)} />
            <RoutePrelude origin={origin} destination={destination} setOrigin={setOrigin} setDestination={setDestination} onPlan={() => setTab('route')} />
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.overline}>Places that draw us closer</Text>
                <Text style={styles.h2}>Find your next sacred place.</Text>
              </View>
              <View style={styles.countPill}><Text style={styles.countPillText}>{CATALOG_TOTAL}</Text></View>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search places" placeholderTextColor="#948a7c" style={styles.searchInput} returnKeyType="search" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((item) => <FilterChip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}
            </ScrollView>
            <Text style={styles.catalogLine}>{CATALOG_TOTAL} places to discover · {MAPPED_TOTAL} mapped · {SOURCE_CHECKED_TOTAL} source checked</Text>
            {filteredPlaces.map((placeItem) => <PlaceCard key={placeItem.id} place={placeItem} saved={savedIds.includes(placeItem.id)} onOpen={setSelected} onSave={toggleSaved} />)}
            {!filteredPlaces.length && <EmptyState title="No places found" body="Try a broader name, city, state, or category." />}
            <View style={styles.morePanel}>
              <Text style={styles.overline}>More than a destination</Text>
              <Text style={styles.h2}>Travel with an open heart.</Text>
              <Text style={styles.body}>A quiet chapel. A moment of prayer. A new intention. Make space for the unexpected gifts of the road.</Text>
            </View>
          </ScrollView>
        )}

        {tab === 'route' && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <CompactHeader eyebrow="The defining feature" title="Find sacred stops along the way." body="Explore mapped Catholic places within your chosen distance of the actual road route." />
            <View style={styles.routePlanner}>
              <Field label="Starting from" value={origin} onChangeText={setOrigin} />
              <Pressable style={styles.swapButton} onPress={() => { setOrigin(destination); setDestination(origin); }}>
                <Ionicons name="swap-vertical" size={21} color={colors.green} />
              </Pressable>
              <Field label="Travelling to" value={destination} onChangeText={setDestination} />
              <Text style={styles.fieldLabel}>Explore within</Text>
              <View style={styles.distanceRow}>{[10, 25, 50, 100].map((miles) => <Pressable key={miles} onPress={() => setCorridor(miles)} style={[styles.distanceButton, corridor === miles && styles.distanceButtonActive]}><Text style={[styles.distanceText, corridor === miles && styles.distanceTextActive]}>{miles} mi</Text></Pressable>)}</View>
              <Pressable style={[styles.primaryButton, routing && styles.disabledButton]} onPress={planRoute} disabled={routing}>{routing ? <ActivityIndicator color={colors.ivory} /> : <><Text style={styles.primaryButtonText}>Find sacred stops</Text><Ionicons name="arrow-forward" size={18} color={colors.ivory} /></>}</Pressable>
            </View>
            {!!routeError && <Notice tone="error" icon="alert-circle-outline" title="Route unavailable" body={routeError} />}
            {route ? <RouteResultPanel route={route} corridor={corridor} selectedStopIds={selectedStopIds} onOpen={setSelected} onToggle={toggleStop} onSaveTrip={saveTrip} /> : <Notice tone="normal" icon="map-outline" title="Route-ready catalog" body={`${MAPPED_TOTAL} mapped places are available. This mobile build uses road geometry from OSRM and never stores a private routing token inside the app.`} />}
          </ScrollView>
        )}

        {tab === 'saved' && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
            <CompactHeader eyebrow="Saved" title="Your pilgrimage, kept close." body="Saved places and journeys stay on this device so you can return to them on the road." />
            <Text style={styles.subhead}>Saved places</Text>
            {savedPlaces.length ? savedPlaces.map((placeItem) => <PlaceCard key={placeItem.id} place={placeItem} saved onOpen={setSelected} onSave={toggleSaved} />) : <EmptyState title="No saved places yet" body="Tap the bookmark on any place to keep it here." />}
            <Text style={styles.subhead}>Selected stops</Text>
            {selectedStops.length ? selectedStops.map((placeItem, index) => <MiniStop key={placeItem.id} index={index + 1} place={placeItem} onRemove={toggleStop} />) : <EmptyState title="No stops selected" body="Add places from details or route suggestions to compose a pilgrimage." />}
            <Text style={styles.subhead}>Saved pilgrimages</Text>
            {trips.length ? trips.map((trip) => <TripCard key={trip.id} trip={trip} onDelete={() => setTrips((current) => current.filter((item) => item.id !== trip.id))} />) : <EmptyState title="No saved pilgrimages yet" body="Generate a route and save it to revisit the journey." />}
          </ScrollView>
        )}

        {tab === 'journal' && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
            <CompactHeader eyebrow="Pilgrim journal" title="A quiet place for remembrance." body="Notes stay on this device. Catholic Compass avoids scores, streaks, or anything that trivializes pilgrimage." />
            {(savedPlaces.length ? savedPlaces : PLACES.slice(0, 6)).map((placeItem) => <JournalCard key={placeItem.id} place={placeItem} value={journal[placeItem.id] ?? ''} onChange={(value) => setJournal((current) => ({...current, [placeItem.id]: value}))} />)}
          </ScrollView>
        )}

        {selected && <PlaceSheet place={selected} saved={savedIds.includes(selected.id)} selectedStop={selectedStopIds.includes(selected.id)} onClose={() => setSelected(null)} onSave={toggleSaved} onStop={toggleStop} />}
        <BottomTabs tab={tab} setTab={setTab} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AppMasthead({onPlan}: {onPlan: () => void}) {
  return (
    <View style={styles.masthead}>
      <View style={styles.railHint}><Text style={styles.railTitle}>Your pilgrimage begins here</Text></View>
      <View style={styles.artworkCard}>
        <PaintedLandscape />
        <View style={styles.artLabel}><Text style={styles.artLabelText}>Original atmospheric artwork · not destination photography</Text></View>
      </View>
      <View style={styles.heroCopy}>
        <Text style={styles.brandLine}>✦ Catholic Compass</Text>
        <Text style={styles.h1}>Sacred places for the road ahead.</Text>
        <Text style={styles.quote}>“Not all those who wander are lost” — J. R. R. Tolkien</Text>
        <Pressable style={styles.primaryButton} onPress={onPlan}><Text style={styles.primaryButtonText}>Plan your pilgrimage</Text><Ionicons name="arrow-forward" size={18} color={colors.ivory} /></Pressable>
      </View>
    </View>
  );
}

function PaintedLandscape() {
  return (
    <View style={styles.painting}>
      <View style={styles.sun} />
      <View style={[styles.mountain, styles.mountainBack]} />
      <View style={[styles.mountain, styles.mountainMid]} />
      <View style={[styles.hill, styles.hillLeft]} />
      <View style={[styles.hill, styles.hillRight]} />
      <View style={styles.road} />
      <View style={styles.chapel}>
        <View style={styles.chapelTower}><Text style={styles.cross}>✝</Text></View>
        <View style={styles.chapelBody}><View style={styles.chapelDoor} /></View>
      </View>
      <View style={[styles.cypress, {right: 34, top: 70, height: 72}]} />
      <View style={[styles.cypress, {right: 58, top: 88, height: 52}]} />
      <View style={[styles.cypress, {right: 110, top: 108, height: 42}]} />
      <Text style={styles.paintingCaption}>Make room for the sacred.</Text>
    </View>
  );
}

function ThemeStrip({onSelect}: {onSelect: (filter: Filter) => void}) {
  return (
    <View style={styles.themeBlock}>
      <Text style={styles.overline}>Curated discovery themes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
        {THEMES.map((theme) => <Pressable key={theme.title} style={styles.themeCard} onPress={() => onSelect(theme.filter)}><Ionicons name={theme.icon} size={23} color={colors.gold} /><Text style={styles.themeTitle}>{theme.title}</Text><Text style={styles.themeBody}>{theme.body}</Text></Pressable>)}
      </ScrollView>
    </View>
  );
}

function RoutePrelude({origin, destination, setOrigin, setDestination, onPlan}: {origin: string; destination: string; setOrigin: (value: string) => void; setDestination: (value: string) => void; onPlan: () => void}) {
  return (
    <View style={styles.prelude}>
      <Text style={styles.overline}>The defining feature</Text>
      <View style={styles.preludeForm}>
        <Field label="Starting from" value={origin} onChangeText={setOrigin} />
        <Field label="Travelling to" value={destination} onChangeText={setDestination} />
        <Pressable style={styles.primaryButton} onPress={onPlan}><Text style={styles.primaryButtonText}>Open route planner</Text><Ionicons name="map-outline" size={18} color={colors.ivory} /></Pressable>
      </View>
      <Text style={styles.catalogLine}>Explore mapped places within 25 miles of your actual road route.</Text>
    </View>
  );
}

function CompactHeader({eyebrow, title, body}: {eyebrow: string; title: string; body: string}) {
  return <View style={styles.compactHeader}><Text style={styles.overline}>{eyebrow}</Text><Text style={styles.h1}>{title}</Text><Text style={styles.body}>{body}</Text></View>;
}

function Field({label, value, onChangeText}: {label: string; value: string; onChangeText: (value: string) => void}) {
  return <View><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} autoCorrect={false} style={styles.fieldInput} placeholderTextColor="#958a7b" /></View>;
}

function FilterChip({label, active, onPress}: {label: Filter; active: boolean; onPress: () => void}) {
  return <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

function PlaceCard({place, saved, onOpen, onSave}: {place: Place; saved: boolean; onOpen: (place: Place) => void; onSave: (place: Place) => void}) {
  return (
    <View style={styles.placeCard}>
      <Pressable style={styles.placeMain} onPress={() => onOpen(place)}>
        <View style={styles.stateSeal}><Text style={styles.stateText}>{place.region}</Text></View>
        <View style={styles.placeContent}>
          <Text style={styles.categoryLine}>{place.categories[0]}</Text>
          <Text style={styles.placeTitle}>{place.name}</Text>
          <Text style={styles.placeArea}>{place.area}, {place.city}, {place.region}</Text>
          <View style={styles.badgeRow}><Badge label={place.verification} tone={place.verification === 'Source checked' ? 'gold' : 'green'} />{place.confidence === 'approximate' ? <Badge label="Approximate" tone="muted" /> : <Badge label="Route ready" tone="green" />}</View>
        </View>
      </Pressable>
      <View style={styles.placeActions}>
        <Pressable style={styles.exploreButton} onPress={() => onOpen(place)}><Text style={styles.exploreText}>Explore place</Text><Ionicons name="arrow-forward" size={16} color={colors.green} /></Pressable>
        <Pressable onPress={() => onSave(place)} style={styles.bookmarkButton}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? colors.gold : colors.green} /></Pressable>
      </View>
    </View>
  );
}

function RouteResultPanel({route, corridor, selectedStopIds, onOpen, onToggle, onSaveTrip}: {route: RouteResult; corridor: number; selectedStopIds: string[]; onOpen: (place: Place) => void; onToggle: (place: Place) => void; onSaveTrip: () => void}) {
  return (
    <View style={styles.resultsPanel}>
      <View style={styles.routeSummary}>
        <View style={styles.routePath}><View style={styles.routeDot} /><View style={styles.routeRail} /><View style={styles.routeDotEnd} /></View>
        <View style={{flex: 1}}><Text style={styles.routeMiles}>{Math.round(route.distanceMiles).toLocaleString()} miles</Text><Text style={styles.routeMeta}>{formatHours(route.durationMinutes)} before added stops</Text><Text style={styles.routeBody}>{route.stops.length} places within {corridor} miles of the road geometry.</Text></View>
      </View>
      <View style={styles.routeButtons}><Pressable style={styles.secondaryButton} onPress={onSaveTrip}><Text style={styles.secondaryText}>Save pilgrimage</Text></Pressable><Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(`https://maps.apple.com/?saddr=${encodeURIComponent(route.fromLabel)}&daddr=${encodeURIComponent(route.toLabel)}`)}><Text style={styles.secondaryText}>Open in Maps</Text></Pressable></View>
      <Text style={styles.subhead}>Suggested stops</Text>
      {route.stops.map((stop) => <View key={stop.id} style={styles.stopCard}><Pressable style={{flex: 1}} onPress={() => onOpen(stop)}><Text style={styles.stopDistance}>{stop.distanceFromRouteMiles.toFixed(1)} mi from route</Text><Text style={styles.stopTitle}>{stop.name}</Text><Text style={styles.placeArea}>{stop.city}, {stop.region}</Text></Pressable><Pressable style={[styles.stopAdd, selectedStopIds.includes(stop.id) && styles.stopAddActive]} onPress={() => onToggle(stop)}><Ionicons name={selectedStopIds.includes(stop.id) ? 'checkmark' : 'add'} size={22} color={selectedStopIds.includes(stop.id) ? colors.ivory : colors.green} /></Pressable></View>)}
      {!route.stops.length && <EmptyState title="No stops in this corridor" body="Try widening the distance from the road." />}
    </View>
  );
}

function PlaceSheet({place, saved, selectedStop, onClose, onSave, onStop}: {place: Place; saved: boolean; selectedStop: boolean; onClose: () => void; onSave: (place: Place) => void; onStop: (place: Place) => void}) {
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><View style={{flex: 1}}><Text style={styles.categoryLine}>{place.categories.join(' / ')}</Text><Text style={styles.sheetTitle}>{place.name}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.green} /></Pressable></View>
        <Text style={styles.placeArea}>{place.address}</Text>
        <Text style={styles.body}>{place.description}</Text>
        {!!place.scheduleNote && <Notice tone="normal" icon="time-outline" title="Schedules" body={place.scheduleNote} />}
        <View style={styles.badgeRow}><Badge label={place.verification} tone={place.verification === 'Source checked' ? 'gold' : 'green'} /><Badge label={place.confidence === 'approximate' ? 'Approximate coordinates' : 'Mapped coordinates'} tone={place.confidence === 'approximate' ? 'muted' : 'green'} /></View>
        <Text style={styles.sourceNote}>{place.sourceNote}</Text>
        <View style={styles.sheetActions}>
          <Pressable style={styles.primaryButton} onPress={() => onSave(place)}><Text style={styles.primaryButtonText}>{saved ? 'Unsave place' : 'Save place'}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => onStop(place)}><Text style={styles.secondaryText}>{selectedStop ? 'Remove from pilgrimage' : 'Add to pilgrimage'}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(place.address)}`)}><Text style={styles.secondaryText}>Directions</Text></Pressable>
          {!!place.website && <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(place.website!)}><Text style={styles.secondaryText}>Official source</Text></Pressable>}
        </View>
      </View>
    </View>
  );
}

function Badge({label, tone}: {label: string; tone: 'gold' | 'green' | 'muted'}) {
  return <View style={[styles.badge, tone === 'gold' && styles.badgeGold, tone === 'muted' && styles.badgeMuted]}><Text style={styles.badgeText}>{label}</Text></View>;
}

function Notice({icon, title, body, tone}: {icon: keyof typeof Ionicons.glyphMap; title: string; body: string; tone: 'normal' | 'error'}) {
  return <View style={[styles.notice, tone === 'error' && styles.noticeError]}><Ionicons name={icon} size={22} color={tone === 'error' ? colors.oxblood : colors.gold} /><View style={{flex: 1}}><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeText}>{body}</Text></View></View>;
}

function MiniStop({index, place, onRemove}: {index: number; place: Place; onRemove: (place: Place) => void}) {
  return <View style={styles.miniStop}><Text style={styles.stopNumber}>{index}</Text><View style={{flex: 1}}><Text style={styles.stopTitle}>{place.name}</Text><Text style={styles.placeArea}>{place.city}, {place.region}</Text></View><Pressable onPress={() => onRemove(place)}><Ionicons name="close-circle-outline" size={24} color={colors.oxblood} /></Pressable></View>;
}

function TripCard({trip, onDelete}: {trip: SavedTrip; onDelete: () => void}) {
  return <View style={styles.tripCard}><Text style={styles.stopTitle}>{trip.name}</Text><Text style={styles.placeArea}>{Math.round(trip.distanceMiles).toLocaleString()} miles · {formatHours(trip.durationMinutes)} · {trip.stopIds.length} stops</Text><Pressable style={styles.deleteButton} onPress={onDelete}><Text style={styles.deleteText}>Delete trip</Text></Pressable></View>;
}

function JournalCard({place, value, onChange}: {place: Place; value: string; onChange: (value: string) => void}) {
  return <View style={styles.journalCard}><Text style={styles.stopTitle}>{place.name}</Text><Text style={styles.placeArea}>{place.city}, {place.region}</Text><TextInput value={value} onChangeText={onChange} multiline placeholder="Prayer intention, reflection, or note..." placeholderTextColor="#958a7b" style={styles.journalInput} /></View>;
}

function EmptyState({title, body}: {title: string; body: string}) {
  return <View style={styles.empty}><Ionicons name="compass-outline" size={30} color={colors.gold} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

function BottomTabs({tab, setTab}: {tab: Tab; setTab: (tab: Tab) => void}) {
  const items: {tab: Tab; label: string; icon: keyof typeof Ionicons.glyphMap}[] = [
    {tab: 'discover', label: 'Discover', icon: 'sparkles-outline'},
    {tab: 'route', label: 'Route', icon: 'map-outline'},
    {tab: 'saved', label: 'Saved', icon: 'bookmark-outline'},
    {tab: 'journal', label: 'Journal', icon: 'journal-outline'}
  ];
  return <View style={styles.tabs}>{items.map((item) => <Pressable key={item.tab} onPress={() => setTab(item.tab)} style={styles.tabButton}><Ionicons name={item.icon} size={23} color={tab === item.tab ? colors.gold : '#d8cdb8'} /><Text style={[styles.tabText, tab === item.tab && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  shell: {flex: 1, backgroundColor: colors.ivory},
  page: {flex: 1, backgroundColor: colors.ivory},
  pageContent: {padding: 16, paddingBottom: 116, gap: 16},
  masthead: {gap: 14},
  railHint: {backgroundColor: colors.green, borderRadius: 28, paddingVertical: 13, paddingHorizontal: 17},
  railTitle: {color: colors.gold2, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '900', fontSize: 12},
  artworkCard: {borderRadius: 30, overflow: 'hidden', backgroundColor: colors.green, borderWidth: 1, borderColor: '#2f5e4f'},
  painting: {height: 284, backgroundColor: colors.sky, overflow: 'hidden'},
  sun: {position: 'absolute', width: 92, height: 92, borderRadius: 46, left: 22, top: 30, backgroundColor: '#ffe6a9', opacity: 0.88},
  mountain: {position: 'absolute', transform: [{rotate: '45deg'}], backgroundColor: '#91a08b'},
  mountainBack: {width: 210, height: 210, left: 34, top: 70, opacity: 0.35},
  mountainMid: {width: 230, height: 230, right: -10, top: 58, opacity: 0.48},
  hill: {position: 'absolute', height: 150, borderTopLeftRadius: 180, borderTopRightRadius: 180, bottom: -30, backgroundColor: colors.hill},
  hillLeft: {left: -70, width: 270},
  hillRight: {right: -52, width: 300, backgroundColor: '#5f744f'},
  road: {position: 'absolute', width: 72, height: 210, right: 88, bottom: -36, backgroundColor: '#e7d4a9', borderRadius: 46, transform: [{rotate: '26deg'}], borderWidth: 2, borderColor: '#f4e8c9'},
  chapel: {position: 'absolute', right: 40, top: 92, alignItems: 'center'},
  chapelTower: {width: 33, height: 48, backgroundColor: '#d9c69c', borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', justifyContent: 'flex-start'},
  chapelBody: {width: 84, height: 58, backgroundColor: '#d3bf91', borderTopLeftRadius: 22, borderTopRightRadius: 22, alignItems: 'center', justifyContent: 'flex-end'},
  chapelDoor: {width: 19, height: 30, backgroundColor: colors.green, borderTopLeftRadius: 12, borderTopRightRadius: 12},
  cross: {color: colors.green, fontSize: 18, marginTop: -13},
  cypress: {position: 'absolute', width: 15, borderRadius: 12, backgroundColor: '#173d34'},
  paintingCaption: {position: 'absolute', left: 18, bottom: 18, right: 150, color: colors.ivory, fontFamily: 'Georgia', fontWeight: '700', fontSize: 28, lineHeight: 31},
  artLabel: {paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#0f312a'},
  artLabelText: {color: '#d7ccb6', fontSize: 11},
  heroCopy: {backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 11},
  brandLine: {color: colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase'},
  h1: {fontFamily: 'Georgia', color: colors.green, fontSize: 34, lineHeight: 38, fontWeight: '700'},
  h2: {fontFamily: 'Georgia', color: colors.green, fontSize: 26, lineHeight: 30, fontWeight: '700'},
  quote: {color: colors.muted, fontSize: 15, lineHeight: 21},
  body: {color: '#50483e', fontSize: 16, lineHeight: 23},
  primaryButton: {minHeight: 54, borderRadius: 18, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16},
  primaryButtonText: {color: colors.ivory, fontSize: 16, fontWeight: '900'},
  themeBlock: {gap: 10},
  overline: {color: colors.gold, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '900', fontSize: 12},
  themeRow: {gap: 10, paddingRight: 16},
  themeCard: {width: 218, minHeight: 146, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 15, gap: 8},
  themeTitle: {fontSize: 18, color: colors.green, fontWeight: '900'},
  themeBody: {fontSize: 14, color: colors.muted, lineHeight: 20},
  prelude: {backgroundColor: colors.green, borderRadius: 28, padding: 17, gap: 12},
  preludeForm: {gap: 10},
  compactHeader: {backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 10},
  fieldLabel: {color: colors.muted, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, marginBottom: 7},
  fieldInput: {minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffaf0', paddingHorizontal: 14, color: colors.ink, fontSize: 16},
  sectionHead: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12},
  countPill: {width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center'},
  countPillText: {color: colors.ivory, fontWeight: '900', fontSize: 20},
  searchBox: {minHeight: 56, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10},
  searchInput: {flex: 1, color: colors.ink, fontSize: 16},
  filterRow: {gap: 8, paddingRight: 16},
  filterChip: {borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 14},
  filterChipActive: {backgroundColor: colors.green, borderColor: colors.green},
  filterText: {color: colors.green, fontWeight: '900', fontSize: 13},
  filterTextActive: {color: colors.ivory},
  catalogLine: {color: colors.muted, fontSize: 13, lineHeight: 19},
  placeCard: {backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, overflow: 'hidden'},
  placeMain: {flexDirection: 'row', gap: 14, padding: 15},
  stateSeal: {width: 54, height: 54, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center'},
  stateText: {fontWeight: '900', color: colors.green, fontSize: 16},
  placeContent: {flex: 1},
  categoryLine: {color: colors.gold, fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.9},
  placeTitle: {fontFamily: 'Georgia', fontSize: 23, lineHeight: 27, fontWeight: '700', color: colors.ink, marginTop: 4},
  placeArea: {fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 5},
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11},
  badge: {borderRadius: 999, backgroundColor: colors.green3, paddingHorizontal: 10, paddingVertical: 6},
  badgeGold: {backgroundColor: colors.gold2},
  badgeMuted: {backgroundColor: '#e8dfd1'},
  badgeText: {fontSize: 11, fontWeight: '900', color: colors.green},
  placeActions: {borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12},
  exploreButton: {flexDirection: 'row', alignItems: 'center', gap: 7},
  exploreText: {color: colors.green, fontWeight: '900'},
  bookmarkButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  morePanel: {backgroundColor: colors.green, borderRadius: 28, padding: 19, gap: 9},
  swapButton: {alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center'},
  distanceRow: {flexDirection: 'row', gap: 8},
  distanceButton: {flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center'},
  distanceButtonActive: {backgroundColor: colors.green, borderColor: colors.green},
  distanceText: {color: colors.green, fontWeight: '900'},
  distanceTextActive: {color: colors.ivory},
  disabledButton: {opacity: 0.7},
  routePlanner: {backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12},
  notice: {flexDirection: 'row', gap: 12, backgroundColor: '#fff8e8', borderWidth: 1, borderColor: '#ecd8a8', borderRadius: 22, padding: 15},
  noticeError: {backgroundColor: '#fff0ec', borderColor: '#e3b8af'},
  noticeTitle: {fontWeight: '900', color: colors.green, fontSize: 15, marginBottom: 3},
  noticeText: {color: '#51483e', fontSize: 14, lineHeight: 20},
  resultsPanel: {gap: 13},
  routeSummary: {flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16},
  routePath: {width: 26, alignItems: 'center'},
  routeDot: {width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold},
  routeRail: {width: 3, flex: 1, minHeight: 72, backgroundColor: colors.line, marginVertical: 4},
  routeDotEnd: {width: 16, height: 16, borderRadius: 8, backgroundColor: colors.green},
  routeMiles: {fontFamily: 'Georgia', color: colors.green, fontSize: 28, fontWeight: '700'},
  routeMeta: {color: colors.muted, marginTop: 4},
  routeBody: {fontSize: 14, color: '#51483e', lineHeight: 20, marginTop: 9},
  routeButtons: {flexDirection: 'row', gap: 10},
  secondaryButton: {flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10},
  secondaryText: {color: colors.green, fontWeight: '900', textAlign: 'center'},
  subhead: {fontFamily: 'Georgia', fontSize: 22, color: colors.green, fontWeight: '700', marginTop: 5},
  stopCard: {flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 14},
  stopDistance: {fontSize: 12, fontWeight: '900', color: colors.gold, textTransform: 'uppercase'},
  stopTitle: {fontSize: 18, lineHeight: 22, fontWeight: '900', color: colors.ink},
  stopAdd: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center'},
  stopAddActive: {backgroundColor: colors.green},
  empty: {alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 24},
  emptyTitle: {fontFamily: 'Georgia', fontSize: 21, color: colors.green, fontWeight: '700', marginTop: 10},
  emptyBody: {color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 6},
  miniStop: {flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 14},
  stopNumber: {width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, color: colors.ivory, textAlign: 'center', lineHeight: 34, fontWeight: '900'},
  tripCard: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 15},
  deleteButton: {alignSelf: 'flex-start', backgroundColor: '#f2ded8', borderRadius: 999, marginTop: 11, paddingHorizontal: 12, paddingVertical: 8},
  deleteText: {color: colors.oxblood, fontWeight: '900'},
  journalCard: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 15},
  journalInput: {minHeight: 112, marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffaf0', padding: 13, color: colors.ink, textAlignVertical: 'top', fontSize: 15, lineHeight: 21},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end'},
  scrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18, 29, 24, 0.48)'},
  sheet: {backgroundColor: colors.ivory, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20, paddingBottom: 102, maxHeight: '88%', borderWidth: 1, borderColor: colors.line},
  sheetHandle: {alignSelf: 'center', width: 48, height: 5, borderRadius: 999, backgroundColor: '#c8baa4', marginBottom: 17},
  sheetHeader: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  sheetTitle: {fontFamily: 'Georgia', color: colors.green, fontSize: 30, lineHeight: 34, fontWeight: '700', marginTop: 5},
  closeButton: {width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center'},
  sourceNote: {fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 12},
  sheetActions: {gap: 10, marginTop: 15},
  tabs: {position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 78, borderRadius: 31, backgroundColor: colors.green, borderWidth: 1, borderColor: '#2d6154', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'},
  tabButton: {minWidth: 70, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4},
  tabText: {fontSize: 12, fontWeight: '900', color: '#d8cdb8'},
  tabTextActive: {color: colors.ivory}
});
