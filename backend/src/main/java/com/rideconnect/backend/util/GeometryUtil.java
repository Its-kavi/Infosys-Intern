package com.rideconnect.backend.util;

import com.google.maps.model.LatLng;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import java.util.List;

public class GeometryUtil {

    private static final GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);

    public static Point createPoint(double lat, double lng) {
        return factory.createPoint(new Coordinate(lng, lat)); // Note: JTS uses (Lng, Lat) order!
    }

    public static LineString createLineString(List<LatLng> pathPoints) {
        Coordinate[] coordinates = new Coordinate[pathPoints.size()];

        for (int i = 0; i < pathPoints.size(); i++) {
            LatLng latLng = pathPoints.get(i);
            // JTS order is (Longitude, Latitude) aka (x, y)
            coordinates[i] = new Coordinate(latLng.lng, latLng.lat);
        }

        return factory.createLineString(coordinates);
    }
}
