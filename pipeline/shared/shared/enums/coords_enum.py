
from shared.enums.base_enum import BaseEnum


class Coords(tuple, BaseEnum):
    """Coordenadas correspondentes ao polígono de cada região. Os valores são retornados em tuplas
    com os valores dispostos nesta ordem: LAT_NORTH, LAT_SOUTH, LON_WEST, LON_EAST."""
    # LAT_NORTH, LAT_SOUTH, LON_WEST, LON_EAST
    SOUTH_AMERICA = (15.0, -60.0, -90.0, -30.0)