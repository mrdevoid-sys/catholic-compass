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
type Category = 'Shrine' | 'Church' | 'Basilica' | 'Latin Mass' | 'Monastery' | 'Pilgrimage' | 'Relics';
type Verification = 'source checked' | 'community listing';
type CoordinateConfidence = 'rooftop' | 'street' | 'approximate';
type Filter = 'All' | Category | 'Source checked' | 'Route ready';

interface Place {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  coordinateConfidence: CoordinateConfidence;
  categories: Category[];
  verification: Verification;
  description: string;
  website?: string;
  phone?: string;
  scheduleNote?: string;
  sourceNote: string;
}

interface RouteResult {
  fromLabel: string;
  toLabel: string;
  distanceMiles: number;
  durationMinutes: number;
  coordinates: Coordinate[];
  stops: SuggestedStop[];
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface SuggestedStop extends Place {
  distanceFromRouteMiles: number;
}

interface SavedTrip {
  id: string;
  name: string;
  from: string;
  to: string;
  distanceMiles: number;
  durationMinutes: number;
  stopIds: string[];
  createdAt: string;
}

interface StoredState {
  savedIds: string[];
  trips: SavedTrip[];
  journal: Record<string, string>;
}

const STORAGE_KEY = 'catholic-compass-mobile:v3';
const MILES_PER_METER = 0.000621371;
const FILTERS: Filter[] = ['All', 'Shrine', 'Church', 'Basilica', 'Latin Mass', 'Monastery', 'Pilgrimage', 'Relics', 'Source checked', 'Route ready'];

const colors = {
  ink: '#201c17',
  muted: '#6d6458',
  green: '#123d34',
  green2: '#1e5a4d',
  green3: '#dce9df',
  ivory: '#fbf6ea',
  parchment: '#f1e7d2',
  card: '#fffdf7',
  line: '#dfd2ba',
  gold: '#b88634',
  gold2: '#ead8aa',
  oxblood: '#792f2f',
  shadow: 'rgba(25, 31, 27, 0.13)'
};

const PLACES: Place[] = [
  {
    id: 'divine-mercy-stockbridge',
    name: 'National Shrine of The Divine Mercy',
    city: 'Stockbridge',
    state: 'MA',
    address: '2 Prospect Hill Rd, Stockbridge, MA 01262',
    latitude: 42.3042,
    longitude: -73.3396,
    coordinateConfidence: 'street',
    categories: ['Shrine', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A pilgrimage shrine in Stockbridge, Massachusetts, cared for by the Marian Fathers and dedicated to the message of Divine Mercy.',
    website: 'https://shrineofdivinemercy.org/',
    phone: '+1 413-298-3931',
    scheduleNote: 'Check the shrine website before travelling for current Mass, confession, and event times.',
    sourceNote: 'Official shrine listing; schedules are not reproduced as current unless checked by the traveler.'
  },
  {
    id: 'st-leonard-boston',
    name: "St. Leonard's Church",
    city: 'Boston',
    state: 'MA',
    address: '320 Hanover St, Boston, MA 02113',
    latitude: 42.3638,
    longitude: -71.0549,
    coordinateConfidence: 'street',
    categories: ['Church'],
    verification: 'source checked',
    description: 'A historic Catholic parish in Boston\'s North End, included as a source-checked church listing.',
    website: 'https://saintleonardchurchboston.org/',
    sourceNote: 'Official parish source retained. Confirm practical details before visiting.'
  },
  {
    id: 'immaculate-conception-washington',
    name: 'Basilica of the National Shrine of the Immaculate Conception',
    city: 'Washington',
    state: 'DC',
    address: '400 Michigan Ave NE, Washington, DC 20017',
    latitude: 38.9334,
    longitude: -77.0007,
    coordinateConfidence: 'street',
    categories: ['Basilica', 'Shrine', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A major Catholic shrine and basilica in Washington, DC, dedicated to the Blessed Virgin Mary under the title of the Immaculate Conception.',
    website: 'https://www.nationalshrine.org/',
    sourceNote: 'Official basilica source. Current liturgical schedules must be checked at the source.'
  },
  {
    id: 'eucharistic-shrine-hanceville',
    name: 'Shrine of the Most Blessed Sacrament',
    city: 'Hanceville',
    state: 'AL',
    address: '3222 County Road 548, Hanceville, AL 35077',
    latitude: 34.0608,
    longitude: -86.7671,
    coordinateConfidence: 'street',
    categories: ['Shrine', 'Monastery', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A shrine and monastic pilgrimage destination in Alabama associated with the Poor Clares of Perpetual Adoration.',
    website: 'https://www.olamshrine.com/',
    sourceNote: 'Official shrine source retained. Confirm visitor details before travelling.'
  },
  {
    id: 'our-lady-of-good-help',
    name: 'National Shrine of Our Lady of Champion',
    city: 'Champion',
    state: 'WI',
    address: '4047 Chapel Dr, Champion, WI 54229',
    latitude: 44.5884,
    longitude: -87.7733,
    coordinateConfidence: 'street',
    categories: ['Shrine', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A Marian shrine in Wisconsin known as the National Shrine of Our Lady of Champion.',
    website: 'https://championshrine.org/',
    sourceNote: 'Official shrine source retained. Apparition-related interpretation is left to official sources.'
  },
  {
    id: 'st-john-cantius-chicago',
    name: 'St. John Cantius Church',
    city: 'Chicago',
    state: 'IL',
    address: '825 N Carpenter St, Chicago, IL 60642',
    latitude: 41.8975,
    longitude: -87.6535,
    coordinateConfidence: 'street',
    categories: ['Church', 'Latin Mass'],
    verification: 'community listing',
    description: 'A Chicago Catholic church widely associated with sacred liturgy and traditional Catholic devotion. Schedule details should be checked from the parish.',
    website: 'https://www.cantius.org/',
    scheduleNote: 'Latin Mass designation is retained as a listing category; check the parish website for current times.',
    sourceNote: 'Community listing with official website attached; Mass times are not asserted as current.'
  },
  {
    id: 'st-mary-pine-bluff',
    name: 'St. Mary of Pine Bluff Catholic Church',
    city: 'Pine Bluff',
    state: 'WI',
    address: '3673 County Road P, Cross Plains, WI 53528',
    latitude: 43.0607,
    longitude: -89.6648,
    coordinateConfidence: 'street',
    categories: ['Church', 'Latin Mass'],
    verification: 'community listing',
    description: 'A Catholic parish listing preserved for travelers seeking traditional liturgy; current schedules require source confirmation.',
    website: 'https://stmarypinebluff.com/',
    scheduleNote: 'Check the parish website for current Mass and confession times.',
    sourceNote: 'Community listing with official site reference.'
  },
  {
    id: 'cathedral-st-paul',
    name: 'Cathedral of Saint Paul',
    city: 'Saint Paul',
    state: 'MN',
    address: '239 Selby Ave, Saint Paul, MN 55102',
    latitude: 44.9469,
    longitude: -93.1086,
    coordinateConfidence: 'street',
    categories: ['Church', 'Pilgrimage'],
    verification: 'source checked',
    description: 'The cathedral church of Saint Paul, Minnesota, a landmark Catholic church overlooking the city.',
    website: 'https://www.cathedralsaintpaul.org/',
    sourceNote: 'Official cathedral source retained.'
  },
  {
    id: 'holy-hill-wisconsin',
    name: 'Basilica and National Shrine of Mary Help of Christians at Holy Hill',
    city: 'Hubertus',
    state: 'WI',
    address: '1525 Carmel Rd, Hubertus, WI 53033',
    latitude: 43.2424,
    longitude: -88.3261,
    coordinateConfidence: 'street',
    categories: ['Basilica', 'Shrine', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A basilica and national shrine in Wisconsin served by Discalced Carmelites, commonly known as Holy Hill.',
    website: 'https://www.holyhill.com/',
    sourceNote: 'Official shrine source retained.'
  },
  {
    id: 'st-cecilia-omaha',
    name: 'St. Cecilia Cathedral',
    city: 'Omaha',
    state: 'NE',
    address: '701 N 40th St, Omaha, NE 68131',
    latitude: 41.2658,
    longitude: -95.9726,
    coordinateConfidence: 'street',
    categories: ['Church'],
    verification: 'source checked',
    description: 'The cathedral church of Omaha, included as a route-ready Catholic destination for Nebraska travelers.',
    website: 'https://stceciliacathedral.org/',
    sourceNote: 'Official cathedral source retained.'
  },
  {
    id: 'boys-town-dowd',
    name: 'Dowd Memorial Chapel of the Immaculate Conception',
    city: 'Boys Town',
    state: 'NE',
    address: '13943 Dowd Dr, Boys Town, NE 68010',
    latitude: 41.2604,
    longitude: -96.1312,
    coordinateConfidence: 'approximate',
    categories: ['Church', 'Pilgrimage'],
    verification: 'community listing',
    description: 'A Catholic chapel listing near Omaha. Coordinates are approximate and practical details should be confirmed before visiting.',
    website: 'https://www.boystown.org/',
    sourceNote: 'Community listing; location is approximate and should be treated as a travel aid rather than a verified property point.'
  },
  {
    id: 'cathedral-holy-cross-boston',
    name: 'Cathedral of the Holy Cross',
    city: 'Boston',
    state: 'MA',
    address: '1400 Washington St, Boston, MA 02118',
    latitude: 42.3416,
    longitude: -71.0708,
    coordinateConfidence: 'street',
    categories: ['Church'],
    verification: 'source checked',
    description: 'The cathedral church of the Archdiocese of Boston.',
    website: 'https://holycrossboston.com/',
    sourceNote: 'Official cathedral source retained.'
  },
  {
    id: 'st-patrick-cathedral-nyc',
    name: "St. Patrick's Cathedral",
    city: 'New York',
    state: 'NY',
    address: '5th Ave, New York, NY 10022',
    latitude: 40.7585,
    longitude: -73.9760,
    coordinateConfidence: 'street',
    categories: ['Church', 'Pilgrimage'],
    verification: 'source checked',
    description: 'A landmark Catholic cathedral in New York City.',
    website: 'https://saintpatrickscathedral.org/',
    sourceNote: 'Official cathedral source retained.'
  },
  {
    id: 'st-anthony-shrine-boston',
    name: 'St. Anthony Shrine',
    city: 'Boston',
    state: 'MA',
    address: '100 Arch St, Boston, MA 02110',
    latitude: 42.3547,
    longitude: -71.0585,
    coordinateConfidence: 'street',
    categories: ['Shrine', 'Church'],
    verification: 'source checked',
    description: 'A Franciscan shrine in downtown Boston.',
    website: 'https://stanthonyshrine.org/',
    sourceNote: 'Official shrine source retained.'
  },
  {
    id: 'saint-mary-oratory-rockford',
    name: 'St. Mary Oratory',
    city: 'Rockford',
    state: 'IL',
    address: '517 Elm St, Rockford, IL 61102',
    latitude: 42.2700,
    longitude: -89.0993,
    coordinateConfidence: 'street',
    categories: ['Church', 'Latin Mass'],
    verification: 'community listing',
    description: 'A Catholic oratory listing retained for traditional liturgy travelers. Confirm current schedules from the oratory before going.',
    website: 'https://www.institute-christ-king.org/rockford-home',
    scheduleNote: 'Traditional liturgy category retained; current schedule must be confirmed from the source.',
    sourceNote: 'Community listing with institute source attached.'
  }
];

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function placeMatches(place: Place, query: string, filter: Filter) {
  const q = normalize(query);
  const text = normalize([place.name, place.city, place.state, place.address, place.description, place.categories.join(' ')].join(' '));
  const queryMatches = !q || q.split(/\s+/).every((term) => text.includes(term));
  const filterMatches = filter === 'All' || (filter === 'Source checked' ? place.verification === 'source checked' : filter === 'Route ready' ? true : place.categories.includes(filter as Category));
  return queryMatches && filterMatches;
}

function haversineMiles(a: Coordinate, b: Coordinate) {
  const radiusMiles = 3958.8;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
}

function pointToSegmentMiles(point: Coordinate, a: Coordinate, b: Coordinate) {
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

function distanceFromPolylineMiles(point: Coordinate, route: Coordinate[]) {
  if (route.length < 2) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length - 1; i += 1) {
    best = Math.min(best, pointToSegmentMiles(point, route[i], route[i + 1]));
  }
  return best;
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} min`;
  return `${hours} hr ${mins} min`;
}

async function geocodePlace(query: string): Promise<Coordinate> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`, {
    headers: {Accept: 'application/json'}
  });
  if (!response.ok) throw new Error('The geocoding service did not respond.');
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`I could not locate "${query}". Try adding the state or ZIP code.`);
  const latitude = Number(rows[0].lat);
  const longitude = Number(rows[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error(`The location result for "${query}" was not usable.`);
  return {latitude, longitude};
}

async function fetchRoadRoute(from: Coordinate, to: Coordinate) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('The routing service did not respond.');
  const json = await response.json();
  const route = json?.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!route || !Array.isArray(coords) || coords.length < 2) throw new Error('No road route was returned for those locations.');
  return {
    distanceMiles: route.distance * MILES_PER_METER,
    durationMinutes: route.duration / 60,
    coordinates: coords.map(([longitude, latitude]: [number, number]) => ({latitude, longitude})) as Coordinate[]
  };
}

export default function App() {
  const [tab, setTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<Place | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [journal, setJournal] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('Portland, Maine');
  const [to, setTo] = useState('Omaha, Nebraska');
  const [corridorMiles, setCorridorMiles] = useState(25);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState('');
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        setSavedIds(parsed.savedIds ?? []);
        setTrips(parsed.trips ?? []);
        setJournal(parsed.journal ?? {});
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const state: StoredState = {savedIds, trips, journal};
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [savedIds, trips, journal]);

  const results = useMemo(() => PLACES.filter((place) => placeMatches(place, query, filter)), [query, filter]);
  const savedPlaces = useMemo(() => PLACES.filter((place) => savedIds.includes(place.id)), [savedIds]);
  const selectedStops = useMemo(() => PLACES.filter((place) => selectedStopIds.includes(place.id)), [selectedStopIds]);
  const routeReadyCount = PLACES.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)).length;
  const checkedCount = PLACES.filter((place) => place.verification === 'source checked').length;
  const latinMassCount = PLACES.filter((place) => place.categories.includes('Latin Mass')).length;

  const toggleSaved = (place: Place) => setSavedIds((current) => (current.includes(place.id) ? current.filter((id) => id !== place.id) : [place.id, ...current]));
  const toggleStop = (place: Place) => setSelectedStopIds((current) => (current.includes(place.id) ? current.filter((id) => id !== place.id) : [...current, place.id]));

  const planRoute = async () => {
    setRouting(true);
    setRouteError('');
    try {
      const [fromCoordinate, toCoordinate] = await Promise.all([geocodePlace(from), geocodePlace(to)]);
      const roadRoute = await fetchRoadRoute(fromCoordinate, toCoordinate);
      const stops = PLACES.map((place) => ({...place, distanceFromRouteMiles: distanceFromPolylineMiles({latitude: place.latitude, longitude: place.longitude}, roadRoute.coordinates)}))
        .filter((place) => place.distanceFromRouteMiles <= corridorMiles)
        .sort((a, b) => a.distanceFromRouteMiles - b.distanceFromRouteMiles);
      setRoute({fromLabel: from, toLabel: to, distanceMiles: roadRoute.distanceMiles, durationMinutes: roadRoute.durationMinutes, coordinates: roadRoute.coordinates, stops});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Route planning failed. Check your connection and try again.';
      setRouteError(message);
    } finally {
      setRouting(false);
    }
  };

  const saveTrip = () => {
    if (!route) return;
    const trip: SavedTrip = {
      id: `trip-${Date.now()}`,
      name: `${route.fromLabel} to ${route.toLabel}`,
      from: route.fromLabel,
      to: route.toLabel,
      distanceMiles: route.distanceMiles,
      durationMinutes: route.durationMinutes,
      stopIds: selectedStopIds,
      createdAt: new Date().toISOString()
    };
    setTrips((current) => [trip, ...current]);
    Alert.alert('Pilgrimage saved', 'Your journey has been saved on this device.');
  };

  const updateJournal = (placeId: string, value: string) => setJournal((current) => ({...current, [placeId]: value}));

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.shell}>
        <Hero />

        {tab === 'discover' && (
          <View style={styles.content}>
            <View style={styles.statRow}>
              <Metric value={PLACES.length} label="places" />
              <Metric value={routeReadyCount} label="mapped" />
              <Metric value={latinMassCount} label="Latin Mass" />
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={21} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search name, city, shrine, basilica..." placeholderTextColor="#9d9282" style={styles.searchInput} returnKeyType="search" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((item) => (
                <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
                  <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({item}) => <PlaceCard place={item} saved={savedIds.includes(item.id)} onOpen={setSelected} onSave={toggleSaved} />}
              ListEmptyComponent={<EmptyState title="No places found" body="Try a broader place name, city, state, or category." />}
            />
          </View>
        )}

        {tab === 'route' && (
          <ScrollView style={styles.content} contentContainerStyle={styles.routeContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionEyebrow}>Along my route</Text>
            <Text style={styles.sectionTitle}>Find sacred stops on the road, not just near a straight line.</Text>
            <Field label="Start" value={from} onChangeText={setFrom} />
            <Field label="Destination" value={to} onChangeText={setTo} />
            <Text style={styles.inputLabel}>Distance from road</Text>
            <View style={styles.corridorRow}>
              {[10, 25, 50, 100].map((miles) => (
                <Pressable key={miles} onPress={() => setCorridorMiles(miles)} style={[styles.corridorButton, corridorMiles === miles && styles.corridorButtonActive]}>
                  <Text style={[styles.corridorText, corridorMiles === miles && styles.corridorTextActive]}>{miles} mi</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.primaryButton, routing && styles.buttonDisabled]} disabled={routing} onPress={planRoute}>
              {routing ? <ActivityIndicator color={colors.ivory} /> : <Text style={styles.primaryButtonText}>Generate route</Text>}
            </Pressable>
            {!!routeError && <Notice icon="alert-circle-outline" title="Route unavailable" body={routeError} tone="error" />}
            {route ? (
              <View style={styles.routeSummary}>
                <View style={styles.routeLine}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeRail} />
                  <View style={styles.routeDotEnd} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.routeTitle}>{Math.round(route.distanceMiles).toLocaleString()} miles</Text>
                  <Text style={styles.routeSub}>{formatHours(route.durationMinutes)} before added stops</Text>
                  <Text style={styles.routeMeta}>{route.stops.length} Catholic places within {corridorMiles} miles of the road geometry.</Text>
                </View>
              </View>
            ) : (
              <Notice icon="map-outline" title={`${routeReadyCount} mapped places ready`} body="Routes use Nominatim geocoding and OSRM road geometry in this build. A future backend can swap in Mapbox without exposing private tokens." tone="normal" />
            )}
            {route && (
              <View style={styles.routeActions}>
                <Pressable style={styles.secondaryButton} onPress={saveTrip}><Text style={styles.secondaryButtonText}>Save pilgrimage</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(`https://maps.apple.com/?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}`)}><Text style={styles.secondaryButtonText}>Open in Maps</Text></Pressable>
              </View>
            )}
            {route && <Text style={styles.subheading}>Suggested stops</Text>}
            {route?.stops.map((place) => (
              <RouteStop key={place.id} place={place} selected={selectedStopIds.includes(place.id)} onToggle={toggleStop} onOpen={setSelected} />
            ))}
            {route && route.stops.length === 0 && <EmptyState title="No stops in this corridor" body="Try a wider distance from the road or a different route." />}
          </ScrollView>
        )}

        {tab === 'saved' && (
          <ScrollView style={styles.content} contentContainerStyle={styles.routeContent}>
            <Text style={styles.sectionEyebrow}>Saved</Text>
            <Text style={styles.sectionTitle}>Places and pilgrimages kept on this phone.</Text>
            <Text style={styles.subheading}>Saved places</Text>
            {savedPlaces.length ? savedPlaces.map((place) => <PlaceCard key={place.id} place={place} saved onOpen={setSelected} onSave={toggleSaved} />) : <EmptyState title="No saved places yet" body="Tap a bookmark on any sacred place to keep it here." />}
            <Text style={styles.subheading}>Saved pilgrimages</Text>
            {trips.length ? trips.map((trip) => <TripCard key={trip.id} trip={trip} onDelete={() => setTrips((current) => current.filter((item) => item.id !== trip.id))} />) : <EmptyState title="No saved pilgrimages yet" body="Create a route and save it to return to the journey later." />}
          </ScrollView>
        )}

        {tab === 'journal' && (
          <ScrollView style={styles.content} contentContainerStyle={styles.routeContent}>
            <Text style={styles.sectionEyebrow}>Pilgrim journal</Text>
            <Text style={styles.sectionTitle}>A quiet place for intentions and remembrance.</Text>
            <Notice icon="book-outline" title="Personal, not performative" body="Journal notes stay on this device. Catholic Compass does not turn pilgrimage into points, streaks, or scores." tone="normal" />
            {(savedPlaces.length ? savedPlaces : PLACES.slice(0, 4)).map((place) => (
              <View key={place.id} style={styles.journalCard}>
                <Text style={styles.journalPlace}>{place.name}</Text>
                <Text style={styles.cardMeta}>{place.city}, {place.state}</Text>
                <TextInput
                  value={journal[place.id] ?? ''}
                  onChangeText={(value) => updateJournal(place.id, value)}
                  multiline
                  placeholder="Prayer intention, reflection, or note..."
                  placeholderTextColor="#9d9282"
                  style={styles.journalInput}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {selected && <PlaceSheet place={selected} saved={savedIds.includes(selected.id)} onClose={() => setSelected(null)} onSave={toggleSaved} onAddStop={toggleStop} inTrip={selectedStopIds.includes(selected.id)} />}

        <View style={styles.tabs}>
          <TabButton icon="sparkles-outline" label="Discover" active={tab === 'discover'} onPress={() => setTab('discover')} />
          <TabButton icon="map-outline" label="Route" active={tab === 'route'} onPress={() => setTab('route')} />
          <TabButton icon="bookmark-outline" label="Saved" active={tab === 'saved'} onPress={() => setTab('saved')} />
          <TabButton icon="journal-outline" label="Journal" active={tab === 'journal'} onPress={() => setTab('journal')} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Hero() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlow} />
      <View style={styles.heroTextBlock}>
        <Text style={styles.kicker}>Catholic Compass</Text>
        <Text style={styles.heroTitle}>Grace along the way</Text>
        <Text style={styles.heroQuote}>"Not all those who wander are lost" - J. R. R. Tolkien</Text>
      </View>
      <View style={styles.compassMark}>
        <Ionicons name="compass-outline" size={30} color={colors.ivory} />
      </View>
    </View>
  );
}

function Metric({value, label}: {value: number; label: string}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Field({label, value, onChangeText}: {label: string; value: string; onChangeText: (value: string) => void}) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor="#9d9282" autoCorrect={false} />
    </View>
  );
}

function PlaceCard({place, saved, onOpen, onSave}: {place: Place; saved: boolean; onOpen: (place: Place) => void; onSave: (place: Place) => void}) {
  return (
    <Pressable onPress={() => onOpen(place)} style={styles.placeCard}>
      <View style={styles.cardTop}>
        <View style={styles.seal}><Ionicons name={place.categories.includes('Shrine') ? 'star-outline' : place.categories.includes('Basilica') ? 'business-outline' : 'ellipse-outline'} size={21} color={colors.gold} /></View>
        <Pressable onPress={() => onSave(place)} hitSlop={12} style={styles.iconButton}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={25} color={saved ? colors.gold : colors.green} /></Pressable>
      </View>
      <Text style={styles.cardTitle}>{place.name}</Text>
      <Text style={styles.cardMeta}>{place.city}, {place.state}</Text>
      <Text numberOfLines={3} style={styles.cardDescription}>{place.description}</Text>
      <View style={styles.badges}>
        <Badge label={place.verification === 'source checked' ? 'Source checked' : 'Community listing'} tone={place.verification === 'source checked' ? 'gold' : 'green'} />
        <Badge label={place.coordinateConfidence === 'approximate' ? 'Approximate location' : 'Route ready'} tone={place.coordinateConfidence === 'approximate' ? 'muted' : 'green'} />
      </View>
    </Pressable>
  );
}

function RouteStop({place, selected, onToggle, onOpen}: {place: SuggestedStop; selected: boolean; onToggle: (place: Place) => void; onOpen: (place: Place) => void}) {
  return (
    <View style={styles.stopCard}>
      <Pressable style={{flex: 1}} onPress={() => onOpen(place)}>
        <Text style={styles.stopDistance}>{place.distanceFromRouteMiles.toFixed(1)} mi from route</Text>
        <Text style={styles.stopTitle}>{place.name}</Text>
        <Text style={styles.cardMeta}>{place.city}, {place.state}</Text>
      </Pressable>
      <Pressable onPress={() => onToggle(place)} style={[styles.addStopButton, selected && styles.addStopButtonActive]}>
        <Ionicons name={selected ? 'checkmark-circle-outline' : 'add-circle-outline'} size={23} color={selected ? colors.ivory : colors.green} />
      </Pressable>
    </View>
  );
}

function TripCard({trip, onDelete}: {trip: SavedTrip; onDelete: () => void}) {
  return (
    <View style={styles.tripCard}>
      <Text style={styles.stopTitle}>{trip.name}</Text>
      <Text style={styles.cardMeta}>{Math.round(trip.distanceMiles).toLocaleString()} miles - {formatHours(trip.durationMinutes)} - {trip.stopIds.length} stops</Text>
      <Pressable style={styles.deleteButton} onPress={onDelete}><Text style={styles.deleteText}>Delete trip</Text></Pressable>
    </View>
  );
}

function PlaceSheet({place, saved, inTrip, onClose, onSave, onAddStop}: {place: Place; saved: boolean; inTrip: boolean; onClose: () => void; onSave: (place: Place) => void; onAddStop: (place: Place) => void}) {
  const directionsUrl = `https://maps.apple.com/?q=${encodeURIComponent(place.address)}`;
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.sheetEyebrow}>{place.categories.join(' / ')}</Text>
            <Text style={styles.sheetTitle}>{place.name}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.green} /></Pressable>
        </View>
        <Text style={styles.cardMeta}>{place.address}</Text>
        <Text style={styles.cardDescription}>{place.description}</Text>
        {!!place.scheduleNote && <Notice icon="time-outline" title="Schedules" body={place.scheduleNote} tone="normal" />}
        <Text style={styles.sourceText}>{place.sourceNote}</Text>
        <View style={styles.sheetActions}>
          <Pressable style={styles.primaryButton} onPress={() => onSave(place)}><Text style={styles.primaryButtonText}>{saved ? 'Unsave place' : 'Save place'}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => onAddStop(place)}><Text style={styles.secondaryButtonText}>{inTrip ? 'Remove from trip' : 'Add to trip'}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(directionsUrl)}><Text style={styles.secondaryButtonText}>Directions</Text></Pressable>
          {!!place.website && <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(place.website!)}><Text style={styles.secondaryButtonText}>Official source</Text></Pressable>}
        </View>
      </View>
    </View>
  );
}

function Badge({label, tone}: {label: string; tone: 'gold' | 'green' | 'muted'}) {
  return <View style={[styles.badge, tone === 'gold' && styles.badgeGold, tone === 'muted' && styles.badgeMuted]}><Text style={styles.badgeText}>{label}</Text></View>;
}

function Notice({icon, title, body, tone}: {icon: keyof typeof Ionicons.glyphMap; title: string; body: string; tone: 'normal' | 'error'}) {
  return (
    <View style={[styles.notice, tone === 'error' && styles.noticeError]}>
      <Ionicons name={icon} size={23} color={tone === 'error' ? colors.oxblood : colors.gold} />
      <View style={{flex: 1}}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{body}</Text>
      </View>
    </View>
  );
}

function EmptyState({title, body}: {title: string; body: string}) {
  return (
    <View style={styles.empty}>
      <Ionicons name="compass-outline" size={32} color={colors.gold} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function TabButton({icon, label, active, onPress}: {icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Ionicons name={icon} size={23} color={active ? colors.gold : '#dacfb9'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {flex: 1, backgroundColor: colors.ivory},
  hero: {height: 214, backgroundColor: colors.green, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end'},
  heroGlow: {position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -80, backgroundColor: 'rgba(234,216,170,0.12)'},
  heroTextBlock: {flex: 1, paddingRight: 18},
  kicker: {color: colors.gold, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase'},
  heroTitle: {color: colors.ivory, fontSize: 36, fontWeight: '900', lineHeight: 39, marginTop: 8},
  heroQuote: {color: '#d8c8a9', fontSize: 13, lineHeight: 18, marginTop: 10},
  compassMark: {width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: '#cda659', alignItems: 'center', justifyContent: 'center', marginBottom: 10},
  content: {flex: 1, paddingHorizontal: 18, paddingTop: 16},
  statRow: {flexDirection: 'row', gap: 10, marginBottom: 14},
  metric: {flex: 1, minHeight: 76, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14, justifyContent: 'center'},
  metricValue: {fontSize: 25, fontWeight: '900', color: colors.green},
  metricLabel: {fontSize: 12, color: colors.muted, marginTop: 2},
  searchBox: {minHeight: 54, borderRadius: 25, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10},
  searchInput: {flex: 1, color: colors.ink, fontSize: 16},
  filterRow: {gap: 8, paddingVertical: 12},
  filter: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line},
  filterActive: {backgroundColor: colors.green, borderColor: colors.green},
  filterText: {fontSize: 13, color: colors.green, fontWeight: '800'},
  filterTextActive: {color: colors.ivory},
  list: {paddingBottom: 112, gap: 14},
  placeCard: {backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 18, shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: {width: 0, height: 6}},
  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  seal: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#f4ead5', alignItems: 'center', justifyContent: 'center'},
  iconButton: {width: 46, height: 46, alignItems: 'center', justifyContent: 'center'},
  cardTitle: {fontSize: 23, lineHeight: 27, fontWeight: '900', color: colors.ink, marginTop: 16},
  cardMeta: {fontSize: 15, color: colors.muted, marginTop: 5},
  cardDescription: {fontSize: 15, lineHeight: 22, color: '#4e473e', marginTop: 12},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14},
  badge: {borderRadius: 999, backgroundColor: colors.green3, paddingHorizontal: 11, paddingVertical: 7},
  badgeGold: {backgroundColor: colors.gold2},
  badgeMuted: {backgroundColor: '#e7dfd1'},
  badgeText: {fontSize: 12, fontWeight: '900', color: colors.green},
  tabs: {position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 78, borderRadius: 30, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: '#2c6154', paddingBottom: 2},
  tabButton: {alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 70, minHeight: 56},
  tabLabel: {fontSize: 12, fontWeight: '800', color: '#dacfb9'},
  tabLabelActive: {color: colors.ivory},
  routeContent: {paddingBottom: 116, gap: 14},
  sectionEyebrow: {fontSize: 13, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.gold},
  sectionTitle: {fontSize: 28, lineHeight: 32, fontWeight: '900', color: colors.green, marginBottom: 2},
  inputLabel: {fontSize: 14, color: colors.muted, fontWeight: '900', marginBottom: 7},
  input: {height: 54, borderRadius: 19, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 15, color: colors.ink, fontSize: 16},
  corridorRow: {flexDirection: 'row', gap: 8},
  corridorButton: {flex: 1, height: 43, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center'},
  corridorButtonActive: {backgroundColor: colors.green, borderColor: colors.green},
  corridorText: {fontSize: 13, fontWeight: '900', color: colors.green},
  corridorTextActive: {color: colors.ivory},
  primaryButton: {backgroundColor: colors.green, minHeight: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  primaryButtonText: {color: colors.ivory, fontWeight: '900', fontSize: 16},
  buttonDisabled: {opacity: 0.7},
  secondaryButton: {backgroundColor: colors.parchment, minHeight: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
  secondaryButtonText: {color: colors.green, fontWeight: '900', fontSize: 15},
  notice: {flexDirection: 'row', gap: 12, backgroundColor: '#fff8e7', borderWidth: 1, borderColor: '#ecd9a8', borderRadius: 20, padding: 15},
  noticeError: {backgroundColor: '#fff1ed', borderColor: '#e6bbb0'},
  noticeTitle: {fontSize: 15, fontWeight: '900', color: colors.green, marginBottom: 3},
  noticeText: {fontSize: 14, lineHeight: 20, color: '#51483d'},
  routeSummary: {flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 18},
  routeLine: {width: 26, alignItems: 'center'},
  routeDot: {width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold},
  routeRail: {width: 3, flex: 1, minHeight: 70, backgroundColor: colors.line, marginVertical: 3},
  routeDotEnd: {width: 16, height: 16, borderRadius: 8, backgroundColor: colors.green},
  routeTitle: {fontSize: 25, fontWeight: '900', color: colors.green},
  routeSub: {fontSize: 15, color: colors.muted, marginTop: 3},
  routeMeta: {fontSize: 14, lineHeight: 20, color: '#4e473e', marginTop: 10},
  routeActions: {flexDirection: 'row', gap: 10},
  subheading: {fontSize: 18, fontWeight: '900', color: colors.green, marginTop: 8},
  stopCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 15},
  stopDistance: {fontSize: 12, color: colors.gold, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8},
  stopTitle: {fontSize: 18, lineHeight: 22, fontWeight: '900', color: colors.ink, marginTop: 4},
  addStopButton: {width: 44, height: 44, borderRadius: 22, backgroundColor: colors.parchment, alignItems: 'center', justifyContent: 'center'},
  addStopButtonActive: {backgroundColor: colors.green},
  empty: {alignItems: 'center', padding: 28, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card},
  emptyTitle: {fontSize: 19, fontWeight: '900', color: colors.green, marginTop: 12},
  emptyBody: {textAlign: 'center', color: colors.muted, lineHeight: 21, marginTop: 6},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end'},
  scrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18, 28, 24, 0.46)'},
  sheet: {backgroundColor: colors.ivory, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, paddingBottom: 96, borderWidth: 1, borderColor: colors.line, maxHeight: '86%'},
  sheetHandle: {alignSelf: 'center', width: 48, height: 5, borderRadius: 999, backgroundColor: '#cbbca5', marginBottom: 18},
  sheetHeader: {flexDirection: 'row', gap: 14, alignItems: 'flex-start'},
  sheetEyebrow: {fontSize: 12, color: colors.gold, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase'},
  sheetTitle: {fontSize: 28, lineHeight: 32, fontWeight: '900', color: colors.green, marginTop: 4},
  closeButton: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.parchment, alignItems: 'center', justifyContent: 'center'},
  sourceText: {fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 12},
  sheetActions: {gap: 10, marginTop: 16},
  tripCard: {backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 15},
  deleteButton: {alignSelf: 'flex-start', marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#f3ded9'},
  deleteText: {color: colors.oxblood, fontWeight: '900'},
  journalCard: {backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16},
  journalPlace: {fontSize: 19, fontWeight: '900', color: colors.green},
  journalInput: {minHeight: 100, textAlignVertical: 'top', marginTop: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffaf0', padding: 13, fontSize: 15, lineHeight: 21, color: colors.ink}
});
