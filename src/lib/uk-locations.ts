export interface Location {
  name: string;
  lat: number;
  lng: number;
  region?: string;
}

export const UK_LOCATIONS: Location[] = [
  // London areas
  { name: "Central London", lat: 51.5074, lng: -0.1278, region: "London" },
  { name: "North London", lat: 51.5615, lng: -0.1029, region: "London" },
  { name: "South London", lat: 51.4504, lng: -0.0977, region: "London" },
  { name: "East London", lat: 51.5285, lng: -0.0216, region: "London" },
  { name: "West London", lat: 51.5074, lng: -0.2150, region: "London" },
  { name: "South East London", lat: 51.4620, lng: 0.0099, region: "London" },
  { name: "South West London", lat: 51.4452, lng: -0.1685, region: "London" },
  { name: "North West London", lat: 51.5504, lng: -0.2036, region: "London" },
  { name: "North East London", lat: 51.5685, lng: -0.0420, region: "London" },

  // Major cities
  { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { name: "Manchester", lat: 53.4808, lng: -2.2426 },
  { name: "Leeds", lat: 53.8008, lng: -1.5491 },
  { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { name: "Sheffield", lat: 53.3811, lng: -1.4701 },
  { name: "Bristol", lat: 51.4545, lng: -2.5879 },
  { name: "Newcastle", lat: 54.9783, lng: -1.6178 },
  { name: "Nottingham", lat: 52.9548, lng: -1.1581 },
  { name: "Leicester", lat: 52.6369, lng: -1.1398 },
  { name: "Coventry", lat: 52.4068, lng: -1.5197 },

  // Scotland
  { name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow", lat: 55.8642, lng: -4.2518 },
  { name: "Aberdeen", lat: 57.1497, lng: -2.0943 },
  { name: "Dundee", lat: 56.4620, lng: -2.9707 },

  // Wales
  { name: "Cardiff", lat: 51.4816, lng: -3.1791 },
  { name: "Swansea", lat: 51.6214, lng: -3.9436 },
  { name: "Newport", lat: 51.5842, lng: -2.9977 },

  // Northern Ireland
  { name: "Belfast", lat: 54.5973, lng: -5.9301 },

  // Large towns
  { name: "Brighton", lat: 50.8225, lng: -0.1372 },
  { name: "Southampton", lat: 50.9097, lng: -1.4044 },
  { name: "Portsmouth", lat: 50.8198, lng: -1.0880 },
  { name: "Plymouth", lat: 50.3755, lng: -4.1427 },
  { name: "Reading", lat: 51.4543, lng: -0.9781 },
  { name: "Milton Keynes", lat: 52.0406, lng: -0.7594 },
  { name: "Oxford", lat: 51.7520, lng: -1.2577 },
  { name: "Cambridge", lat: 52.2053, lng: 0.1218 },
  { name: "Norwich", lat: 52.6309, lng: 1.2974 },
  { name: "Ipswich", lat: 52.0567, lng: 1.1482 },
  { name: "York", lat: 53.9591, lng: -1.0815 },
  { name: "Hull", lat: 53.7676, lng: -0.3274 },
  { name: "Stoke-on-Trent", lat: 53.0027, lng: -2.1794 },
  { name: "Derby", lat: 52.9225, lng: -1.4746 },
  { name: "Wolverhampton", lat: 52.5870, lng: -2.1288 },
  { name: "Sunderland", lat: 54.9069, lng: -1.3838 },
  { name: "Bournemouth", lat: 50.7192, lng: -1.8808 },
  { name: "Luton", lat: 51.8787, lng: -0.4200 },
  { name: "Northampton", lat: 52.2405, lng: -0.9027 },
  { name: "Peterborough", lat: 52.5695, lng: -0.2405 },
  { name: "Swindon", lat: 51.5558, lng: -1.7797 },
  { name: "Exeter", lat: 50.7184, lng: -3.5339 },
  { name: "Cheltenham", lat: 51.8994, lng: -2.0783 },
  { name: "Bath", lat: 51.3811, lng: -2.3590 },
  { name: "Gloucester", lat: 51.8642, lng: -2.2382 },
  { name: "Chester", lat: 53.1930, lng: -2.8931 },
  { name: "Preston", lat: 53.7632, lng: -2.7031 },
  { name: "Blackpool", lat: 53.8175, lng: -3.0357 },
  { name: "Bradford", lat: 53.7960, lng: -1.7594 },
  { name: "Huddersfield", lat: 53.6450, lng: -1.7798 },
  { name: "Wakefield", lat: 53.6830, lng: -1.4977 },
  { name: "Middlesbrough", lat: 54.5742, lng: -1.2350 },
  { name: "Doncaster", lat: 53.5228, lng: -1.1285 },
  { name: "Barnsley", lat: 53.5526, lng: -1.4797 },
];

export function getGroupedLocations(): Record<string, Location[]> {
  const grouped: Record<string, Location[]> = {};

  for (const loc of UK_LOCATIONS) {
    const group = loc.region || "Cities & Towns";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(loc);
  }

  // Sort each group alphabetically
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  return grouped;
}
