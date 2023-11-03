import { Location } from "../reflect/model/client";

export function flagEmojiForLocation(location: Location | undefined) {
  if (!location) {
    return "🌎";
  }
  const flagEmoji = String.fromCodePoint(
    ...location.country
      .toUpperCase()
      .split("")
      .map((char: string) => 127397 + char.charCodeAt(0))
  );
  return flagEmoji;
}

export function displayStringForLocation(location: Location | undefined) {
  const city = location ? decodeURI(location.city) : "Earth";
  return `${city} ${flagEmojiForLocation(location)}`;
}
