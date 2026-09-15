import unittest
import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.geo import (
    validate_and_fix_coordinates,
    get_official_coordinates,
    haversine_distance_km,
    resolve_location_from_text,
    UMBRIA_TOWN_COORDINATES
)

class TestGeoModule(unittest.TestCase):
    def test_official_coordinates_lookup(self):
        perugia_coords = get_official_coordinates("Perugia")
        self.assertEqual(perugia_coords, (43.1107, 12.3908))
        
        assisi_coords = get_official_coordinates(" Assisi ")
        self.assertEqual(assisi_coords, (43.0707, 12.6196))

        spoleto_frazione = get_official_coordinates("Spoleto (Baiano)")
        self.assertIsNotNone(spoleto_frazione)

    def test_haversine_distance(self):
        dist = haversine_distance_km(43.1107, 12.3908, 43.0707, 12.6196)
        self.assertTrue(18.0 <= dist <= 21.0)

    def test_validate_and_fix_coordinates(self):
        lat, lon, corrected = validate_and_fix_coordinates("Perugia", "PG", 43.1100, 12.3900)
        self.assertEqual((lat, lon), (43.1100, 12.3900))
        self.assertFalse(corrected)

        lat, lon, corrected = validate_and_fix_coordinates("Perugia", "PG", 41.9028, 12.4964)
        self.assertEqual((lat, lon), UMBRIA_TOWN_COORDINATES["perugia"])
        self.assertTrue(corrected)

        lat, lon, corrected = validate_and_fix_coordinates("Assisi", "PG", 0.0, 0.0)
        self.assertEqual((lat, lon), UMBRIA_TOWN_COORDINATES["assisi"])
        self.assertTrue(corrected)

    def test_resolve_location_from_text(self):
        lat, lon = resolve_location_from_text(city="", description="Sagra della Cipolla a Cannara", province="PG")
        self.assertEqual((lat, lon), UMBRIA_TOWN_COORDINATES["cannara"])

    def test_pomonte_and_frazioni_coordinates(self):
        pomonte = get_official_coordinates("Pomonte")
        self.assertEqual(pomonte, (42.9417, 12.5125))

        pretola = get_official_coordinates("Pretola")
        self.assertEqual(pretola, (43.1147, 12.4394))

        sant_egidio = get_official_coordinates("Sant'Egidio")
        self.assertEqual(sant_egidio, (43.1044, 12.4910))

        # Test that Pomonte gets corrected when wrongly set to Perugia coordinates
        lat, lon, corrected = validate_and_fix_coordinates("Pomonte", "PG", 43.1107, 12.3908)
        self.assertTrue(corrected)
        self.assertEqual((lat, lon), (42.9417, 12.5125))

if __name__ == "__main__":
    unittest.main()
