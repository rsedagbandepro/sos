/*
# Enable PostGIS Extension

Enables the PostGIS spatial extension for geolocation queries.
This allows storing geographic points and performing distance-based queries
to find nearby mechanics based on driver breakdown location.
*/

CREATE EXTENSION IF NOT EXISTS postgis;
