import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

type Tab = 'discover' | 'route' | 'saved' | 'guide';
type Filter = 'All places' | 'Shrines' | 'Churches' | 'Basilicas' | 'Latin Mass' | 'Monasteries' | 'Pilgrimage' | 'Relics' | 'Source checked' | 'Route ready';

interface Place {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  description: string;
  sourceLabel: string;
  website: string;
  categories: Filter[];
  reviewed: boolean;
  routeReady: boolean;
}

const places: Place[] = [
  {
    id: 'divine-mercy-stockbridge',
    name: 'National Shrine of The Divine Mercy',
    city: 'Stockbridge',
    state: 'MA',
    address: '2 Prospect Hill Rd, Stockbridge, MA 01262',
    description: 'A place of pilgrimage in Stockbridge, Massachusetts, cared for by the Marian Fathers and dedicated to the message of Divine Mercy.',
    sourceLabel: 'Shrine website',
    website: 'https://shrineofdivinemercy.org/',
    categories: ['Shrines', 'Pilgrimage', 'Route ready'],
    reviewed: true,
    routeReady: true
  },
  {
    id: 'st-leonard-boston',
    name: "St. Leonard's Church",
    city: 'Boston',
    state: 'MA',
    address: '320 Hanover St, Boston, MA 02113',
    description: 'A source-checked parish listing from the Catholic Compass catalog. Confirm schedules and practical details before travelling.',
    sourceLabel: 'Official parish website',
    website: 'https://saintleonardchurchboston.org',
    categories: ['Churches', 'Route ready'],
    reviewed: true,
    routeReady: true
  },
  {
    id: 'latin-mass-community-listing',
    name: 'Latin Mass community listings',
    city: 'Multiple locations',
    state: 'US',
    address: 'Imported venue records retained with source status',
    description: 'Catholic Compass preserves imported Latin Mass listings without claiming schedules are current until they are verified from present sources.',
    sourceLabel: 'Imported listings',
    website: '',
    categories: ['Latin Mass'],
    reviewed: false,
    routeReady: true
  }
];

const catalogStats = {total: 604, mapped: 603, checked: 17, latinMass: 462};
const storageKey = 'catholic-compass-mobile:v1';
const filters: Filter[] = ['All places', 'Shrines', 'Churches', 'Basilicas', 'Latin Mass', 'Monasteries', 'Pilgrimage', 'Relics', 'Source checked', 'Route ready'];

const colors = {
  green: '#173d35',
  green2: '#245449',
  ivory: '#fbf7ed',
  parchment: '#f3ead8',
  gold: '#b8893b',
  ink: '#231f1a',
  muted: '#6e675d',
  line: '#ded2bd',
  white: '#fffdf8'
};

function plain(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(place: Place, query: string, filter: Filter) {
  const q = plain(query);
  const text = plain([place.name, place.city, place.state, place.address, place.description, place.sourceLabel, place.categories.join(' ')].join(' '));
  const queryMatches = !q || q.split(/\s+/).every((term) => text.includes(term));
  const filterMatches =
    filter === 'All places' ||
    (filter === 'Source checked' ? place.reviewed : filter === 'Route ready' ? place.routeReady : place.categories.includes(filter));
  return queryMatches && filterMatches;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All places');
  const [selected, setSelected] = useState<Place | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [routeFrom, setRouteFrom] = useState('Portland, Maine');
  const [routeTo, setRouteTo] = useState('Omaha, Nebraska');

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (value) setSavedIds(JSON.parse(value).savedIds ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify({savedIds})).catch(() => undefined);
  }, [savedIds]);

  const results = useMemo(() => places.filter((place) => matches(place, query, filter)), [filter, query]);
  const savedPlaces = useMemo(() => places.filter((place) => savedIds.includes(place.id)), [savedIds]);
  const toggleSaved = (place: Place) => setSavedIds((current) => (current.includes(place.id) ? current.filter((id) => id !== place.id) : [place.id, ...current]));

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Catholic Compass</Text>
          <Text style={styles.title}>Not all those who wander are lost</Text>
          <Text style={styles.quote}>J. R. R. Tolkien</Text>
        </View>
        <View style={styles.mark}>
          <Ionicons name="compass-outline" size={26} color={colors.ivory} />
        </View>
      </View>

      {tab === 'discover' && (
        <View style={styles.content}>
          <View style={styles.statRow}>
            <Stat label="places" value={catalogStats.total} />
            <Stat label="mapped" value={catalogStats.mapped} />
            <Stat label="Latin Mass" value={catalogStats.latinMass} />
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search name, city, shrine, basilica..." placeholderTextColor="#958b7d" style={styles.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map((item) => (
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
        <ScrollView style={styles.content} contentContainerStyle={styles.panelList}>
          <Text style={styles.sectionTitle}>Along my route</Text>
          <Text style={styles.bodyText}>The production route planner belongs on the Catholic Compass backend so private Mapbox tokens never ship inside the app.</Text>
          <LabeledInput label="Start" value={routeFrom} onChangeText={setRouteFrom} />
          <LabeledInput label="Destination" value={routeTo} onChangeText={setRouteTo} />
          <View style={styles.notice}>
            <Ionicons name="map-outline" size={22} color={colors.gold} />
            <Text style={styles.noticeText}>{catalogStats.mapped} places are route-ready. Distance must be measured from actual road geometry, never a straight-line shortcut.</Text>
          </View>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Connect production routing</Text>
          </Pressable>
        </ScrollView>
      )}

      {tab === 'saved' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Saved places</Text>
          <FlatList
            data={savedPlaces}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({item}) => <PlaceCard place={item} saved onOpen={setSelected} onSave={toggleSaved} />}
            ListEmptyComponent={<EmptyState title="No saved places yet" body="Save churches, shrines, monasteries, and pilgrimage stops as you discover them." />}
          />
        </View>
      )}

      {tab === 'guide' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.panelList}>
          <Text style={styles.sectionTitle}>Pilgrim guide</Text>
          <GuideCard icon="shield-checkmark-outline" title="Verified, not inflated" body={`${catalogStats.checked} places have source-checked details. Community listings remain clearly labeled until reviewed.`} />
          <GuideCard icon="car-outline" title="Built for real travel" body="Route suggestions must come from actual road geometry and server-side routing, with added time calculated after stops are selected." />
          <GuideCard icon="book-outline" title="Personal remembrance" body="The native app will carry saved journeys, reflections, and visited places without turning pilgrimage into a score." />
        </ScrollView>
      )}

      {selected && <PlaceSheet place={selected} saved={savedIds.includes(selected.id)} onClose={() => setSelected(null)} onSave={toggleSaved} />}

      <View style={styles.tabs}>
        <TabButton icon="sparkles-outline" label="Discover" active={tab === 'discover'} onPress={() => setTab('discover')} />
        <TabButton icon="map-outline" label="Route" active={tab === 'route'} onPress={() => setTab('route')} />
        <TabButton icon="bookmark-outline" label="Saved" active={tab === 'saved'} onPress={() => setTab('saved')} />
        <TabButton icon="journal-outline" label="Guide" active={tab === 'guide'} onPress={() => setTab('guide')} />
      </View>
    </SafeAreaView>
  );
}

function Stat({label, value}: {label: string; value: number}) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function PlaceCard({place, saved, onOpen, onSave}: {place: Place; saved: boolean; onOpen: (place: Place) => void; onSave: (place: Place) => void}) {
  return (
    <Pressable onPress={() => onOpen(place)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.seal}><Ionicons name={place.categories.includes('Shrines') ? 'star-outline' : 'business-outline'} size={19} color={colors.gold} /></View>
        <Pressable onPress={() => onSave(place)} hitSlop={10} style={styles.saveButton}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.gold : colors.green} /></Pressable>
      </View>
      <Text style={styles.cardTitle}>{place.name}</Text>
      <Text style={styles.cardMeta}>{place.city}, {place.state}</Text>
      <Text numberOfLines={2} style={styles.cardDescription}>{place.description}</Text>
      <View style={styles.badges}>
        <Badge label={place.reviewed ? 'Source checked' : 'Community listing'} tone={place.reviewed ? 'gold' : 'green'} />
        <Badge label={place.routeReady ? 'Route ready' : 'Coordinates needed'} tone={place.routeReady ? 'green' : 'muted'} />
      </View>
    </Pressable>
  );
}

function Badge({label, tone}: {label: string; tone: 'gold' | 'green' | 'muted'}) {
  return <View style={[styles.badge, tone === 'gold' && styles.badgeGold, tone === 'muted' && styles.badgeMuted]}><Text style={styles.badgeText}>{label}</Text></View>;
}

function PlaceSheet({place, saved, onClose, onSave}: {place: Place; saved: boolean; onClose: () => void; onSave: (place: Place) => void}) {
  const openWebsite = () => place.website && Linking.openURL(place.website);
  const openDirections = () => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(place.address || `${place.name}, ${place.city}, ${place.state}`)}`);
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{place.name}</Text>
        <Text style={styles.cardMeta}>{place.address}</Text>
        <Text style={styles.bodyText}>{place.description}</Text>
        <View style={styles.badges}><Badge label={place.sourceLabel} tone={place.reviewed ? 'gold' : 'green'} /><Badge label={place.routeReady ? 'Coordinates available' : 'Coordinates needed'} tone={place.routeReady ? 'green' : 'muted'} /></View>
        <View style={styles.sheetActions}>
          <Pressable style={styles.primaryButton} onPress={() => onSave(place)}><Text style={styles.primaryButtonText}>{saved ? 'Unsave place' : 'Save place'}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={openDirections}><Text style={styles.secondaryButtonText}>Directions</Text></Pressable>
          {!!place.website && <Pressable style={styles.secondaryButton} onPress={openWebsite}><Text style={styles.secondaryButtonText}>Source website</Text></Pressable>}
        </View>
      </View>
    </View>
  );
}

function EmptyState({title, body}: {title: string; body: string}) {
  return <View style={styles.empty}><Ionicons name="compass-outline" size={28} color={colors.gold} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

function LabeledInput({label, value, onChangeText}: {label: string; value: string; onChangeText: (value: string) => void}) {
  return <View><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} style={styles.input} /></View>;
}

function GuideCard({icon, title, body}: {icon: keyof typeof Ionicons.glyphMap; title: string; body: string}) {
  return <View style={styles.guideCard}><Ionicons name={icon} size={24} color={colors.gold} /><View style={{flex: 1}}><Text style={styles.guideTitle}>{title}</Text><Text style={styles.bodyText}>{body}</Text></View></View>;
}

function TabButton({icon, label, active, onPress}: {icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void}) {
  return <Pressable onPress={onPress} style={styles.tabButton}><Ionicons name={icon} size={22} color={active ? colors.gold : '#d5c8b0'} /><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  shell: {flex: 1, backgroundColor: colors.ivory},
  header: {paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  kicker: {color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase'},
  title: {color: colors.ivory, fontSize: 28, fontWeight: '700', lineHeight: 32, maxWidth: 280, marginTop: 6},
  quote: {color: '#d9c9a8', fontSize: 13, marginTop: 6},
  mark: {width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#d0b16a', alignItems: 'center', justifyContent: 'center'},
  content: {flex: 1, paddingHorizontal: 18, paddingTop: 16},
  statRow: {flexDirection: 'row', gap: 10, marginBottom: 14},
  stat: {flex: 1, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 14},
  statValue: {fontSize: 22, fontWeight: '800', color: colors.green},
  statLabel: {fontSize: 12, color: colors.muted, marginTop: 2},
  searchBox: {height: 50, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10},
  searchInput: {flex: 1, color: colors.ink, fontSize: 15},
  filterRow: {gap: 8, paddingVertical: 12},
  filter: {paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line},
  filterActive: {backgroundColor: colors.green, borderColor: colors.green},
  filterText: {fontSize: 13, color: colors.green, fontWeight: '700'},
  filterTextActive: {color: colors.ivory},
  list: {paddingBottom: 104, gap: 12},
  card: {backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16},
  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  seal: {width: 36, height: 36, borderRadius: 18, backgroundColor: colors.parchment, alignItems: 'center', justifyContent: 'center'},
  saveButton: {width: 42, height: 42, alignItems: 'center', justifyContent: 'center'},
  cardTitle: {fontSize: 20, lineHeight: 24, fontWeight: '800', color: colors.ink, marginTop: 12},
  cardMeta: {fontSize: 14, color: colors.muted, marginTop: 4},
  cardDescription: {fontSize: 14, lineHeight: 20, color: '#4f473d', marginTop: 10},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  badge: {borderRadius: 999, backgroundColor: '#dfe9e2', paddingHorizontal: 10, paddingVertical: 6},
  badgeGold: {backgroundColor: '#f0dfb9'},
  badgeMuted: {backgroundColor: '#e8e1d5'},
  badgeText: {fontSize: 12, fontWeight: '800', color: colors.green},
  tabs: {position: 'absolute', left: 12, right: 12, bottom: 12, height: 72, borderRadius: 28, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: '#2f5d51'},
  tabButton: {alignItems: 'center', gap: 4, minWidth: 68},
  tabLabel: {fontSize: 11, fontWeight: '700', color: '#d5c8b0'},
  tabLabelActive: {color: colors.ivory},
  sectionTitle: {fontSize: 26, lineHeight: 31, color: colors.green, fontWeight: '800', marginBottom: 12},
  bodyText: {fontSize: 15, lineHeight: 22, color: '#4d463d'},
  panelList: {paddingBottom: 110, gap: 14},
  inputLabel: {fontSize: 13, color: colors.muted, fontWeight: '800', marginBottom: 6},
  input: {height: 50, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14, color: colors.ink, fontSize: 15},
  notice: {flexDirection: 'row', gap: 10, backgroundColor: '#fff8e8', borderColor: '#ead8a9', borderWidth: 1, borderRadius: 18, padding: 14},
  noticeText: {flex: 1, color: '#514636', fontSize: 14, lineHeight: 20},
  primaryButton: {backgroundColor: colors.green, minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  primaryButtonText: {color: colors.ivory, fontWeight: '800', fontSize: 15},
  secondaryButton: {backgroundColor: colors.parchment, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  secondaryButtonText: {color: colors.green, fontWeight: '800', fontSize: 15},
  empty: {alignItems: 'center', padding: 28, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white},
  emptyTitle: {fontSize: 18, fontWeight: '800', color: colors.green, marginTop: 10},
  emptyBody: {textAlign: 'center', color: colors.muted, lineHeight: 20, marginTop: 6},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end'},
  scrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(19, 26, 22, 0.42)'},
  sheet: {backgroundColor: colors.ivory, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 100, borderWidth: 1, borderColor: colors.line},
  sheetHandle: {alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#cdbfaa', marginBottom: 18},
  sheetTitle: {fontSize: 27, lineHeight: 31, fontWeight: '800', color: colors.green},
  sheetActions: {gap: 10, marginTop: 18},
  guideCard: {flexDirection: 'row', gap: 14, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 22, padding: 16},
  guideTitle: {fontSize: 18, fontWeight: '800', color: colors.green, marginBottom: 4}
});
