"""
Unit tests for pipeline/automated_domain_extractor.py.
Verifies domain configurations, modulo arithmetic, and keyword specifications.
"""

from pipeline.automated_domain_extractor import DOMAIN_SLOTS, get_slot_for_hour


def test_domain_slots_count_and_hours():
    assert len(DOMAIN_SLOTS) == 4

    # Verify Slot 0: Data & Analytics
    slot0 = DOMAIN_SLOTS[0]
    assert slot0["name"] == "Data & Analytics"
    assert "data analyst" in slot0["keywords"]
    assert "power bi" in slot0["keywords"]
    assert slot0["hours"] == [0, 4, 8, 12, 16, 20]
    assert slot0["freshness"] == 4.0

    # Verify Slot 1: Python Development
    slot1 = DOMAIN_SLOTS[1]
    assert slot1["name"] == "Python Development"
    assert "python developer" in slot1["keywords"]
    assert "fastapi developer" in slot1["keywords"]
    assert slot1["hours"] == [1, 5, 9, 13, 17, 21]
    assert slot1["freshness"] == 4.0

    # Verify Slot 2: Java Development
    slot2 = DOMAIN_SLOTS[2]
    assert slot2["name"] == "Java Development"
    assert "java developer" in slot2["keywords"]
    assert "spring boot developer" in slot2["keywords"]
    assert slot2["hours"] == [2, 6, 10, 14, 18, 22]
    assert slot2["freshness"] == 4.0

    # Verify Slot 3: Cloud & DevOps
    slot3 = DOMAIN_SLOTS[3]
    assert slot3["name"] == "Cloud & DevOps"
    assert "cloud engineer" in slot3["keywords"]
    assert "kubernetes developer" in slot3["keywords"]
    assert slot3["hours"] == [3, 7, 11, 15, 19, 23]
    assert slot3["freshness"] == 4.0


def test_modulo_hour_mapping():
    # Test all 24 hours of the day
    for hour in range(24):
        slot = get_slot_for_hour(hour)
        expected_slot_idx = hour % 4
        assert slot["slot"] == expected_slot_idx
        assert hour in slot["hours"]
