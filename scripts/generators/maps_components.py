from .utils import write_file

def generate_maps_components(base_dir: str):
    maps_content = """
"use client";
import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '400px', borderRadius: '1rem' };
const center = { lat: 26.8467, lng: 80.9462 }; // Lucknow

export function PremiumHeatmap({ hotspots }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['visualization']
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>;

  // Convert your hotspot data to Google Maps LatLng objects
  const heatmapData = hotspots.map(h => ({
    location: new window.google.maps.LatLng(h.lat, h.lng),
    weight: h.weight
  }));

  return (
    <div className=".card p-2 overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [ /* Insert SnazzyMaps dark theme JSON here for premium look */ ],
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{ radius: 20, opacity: 0.8 }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
"""
    write_file(f"{base_dir}/src/components/maps/PremiumHeatmap.tsx", maps_content)