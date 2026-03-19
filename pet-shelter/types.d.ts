// 16 items in pets.json
/** Informatie over een huisdier in een dierenasiel (uit `pets.json`). */
export interface Pet {
    /** De ID voor dit huisdier. */
    id: number;

    /** De naam van het huisdier. Als het dier nog geen naam heeft, dan is dit een lege string. */
    name: string; // 5 zonder naam (lege string)

    /** Een omschrijving van het huisdier. */
    description: string; // Minimaal 100 karakters, gevarieerde tekststructuur, hou er rekening mee als de naam leeg is

    /** Geeft aan of dit huisdier nog beschikbaar is in het asiel. */
    isAvailable: boolean; // 3 niet, anderen wel

    /** De leeftijd van het huisdier. */
    age: number;

    /** De dag waarop het huisdier opgenomen is in het asiel (in `yyyy-mm-dd` formaat). */
    admissionDate: string;

    /** De URL naar een foto van het huisdier. */
    imageUrl: string; // "https://raw.githubusercontent.com/f78doesthings/project-datasets/refs/heads/main/pet-shelter/images/pets/<id>.webp"

    /** Het soort dier. */
    species: PetSpecies; // 5 katten en honden, 2 konijnen, cavia's en hamsters

    /** Geeft aan of dit dier mannelijk of vrouwelijk is. */
    gender: PetGender;

    /** Het ras van het dier. */
    breed: string;

    /** De karaktereigenschappen en trekken van het huisdier, bv. "Speels", "Rustig", "Komt graag buiten", ... */
    characteristics: string[]; // 0-3 eigenschappen/trekken per dier, 1-3 woorden per eigenschap/trek

    /** Het dierenasiel waar het huisdier zich bevindt (uit `shelters.json`). */
    shelter: Shelter; // 1 asiel met 0 dieren, 1 asiel met 1, 2 asiels met 2, 2 asiels met 3, 2 asiels met 4
}

/** De soorten huisdieren die gekend zijn in deze applicatie. */
export type PetSpecies = "Kat" | "Hond" | "Konijn" | "Cavia" | "Hamster";

export type PetGender = "Mannelijk" | "Vrouwelijk";

// 7 items in shelters.json
/** Informatie over een dierenasiel (uit `shelters.json`). */
export interface Shelter {
    /** De ID voor dit dierenasiel. */
    id: number;

    /** De naam van het asiel. */
    name: string;

    /** Het adres van het asiel. */
    address: string; // Fictief adres ergens in Vlaanderen

    /** De openingsuren van het asiel. */
    openHours: string;

    /** De URL naar een foto van de buitenkant van het asiel. */
    imageUrl: string; // "https://raw.githubusercontent.com/f78doesthings/project-datasets/refs/heads/main/pet-shelter/images/shelters/<id>.webp"

    /** Het telefoonnummer van het asiel, als deze er een heeft, anders is dit een lege string. */
    phone: string; // Moet geldig zijn en overeenkomen met de regio uit het adres; 1 keer leeg laten

    /** Het e-mailadres van het asiel, als deze er een heeft, anders is dit een lege string. */
    email: string; // "<alias>@example.(com|org|net)"; 2 keer leeg laten

    /** De URL naar de website van het asiel, als deze er een heeft, anders is dit een lege string. */
    websiteUrl: string; // "<alias>.example.(com|org|net)"; 3 keer leeg laten, mag verschillen met e-mail
}
