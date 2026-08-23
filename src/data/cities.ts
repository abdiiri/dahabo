/**
 * Cities and towns offered in the city dropdown wherever the app asks for a
 * pickup point, destination, or branch/warehouse city. Kenyan hubs and
 * regional towns come first (most common), followed by the cross-border
 * destinations this fleet regularly serves. The dropdown that consumes this
 * list still lets staff type a custom value for anything not listed here —
 * this is a shortlist for speed, not a hard restriction.
 */
export const CITIES: string[] = [
  // Major Kenyan hubs
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Nyeri",
  "Machakos",
  "Meru",
  "Naivasha",
  "Kericho",
  "Kitale",
  "Kakamega",
  "Bungoma",
  "Malindi",
  "Voi",
  "Isiolo",
  "Garissa",
  "Kilifi",
  "Lamu",
  "Nanyuki",
  "Embu",
  "Kitui",
  "Mwingi",
  "Homa Bay",
  "Migori",
  "Narok",
  "Kajiado",
  "Wajir",
  "Mandera",
  "Marsabit",
  "Lodwar",
  // Regional / cross-border destinations
  "Kampala",
  "Jinja",
  "Dar es Salaam",
  "Arusha",
  "Moshi",
  "Mwanza",
  "Dodoma",
  "Kigali",
  "Addis Ababa",
  "Juba",
  "Bujumbura",
];
