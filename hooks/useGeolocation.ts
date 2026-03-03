import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  country: string;
  country_code: string;
  timezone: string;
}

interface GeolocationState {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const { user } = useAuth();
  const [state, setState] = useState<GeolocationState>({ location: null, loading: false, error: null });

  const requestAndStore = useCallback(async (): Promise<LocationData | null> => {
    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState(s => ({ ...s, loading: false, error: 'Quyền truy cập vị trí bị từ chối' }));
        return null;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });

      const locationData: LocationData = {
        latitude,
        longitude,
        city: geo?.city ?? geo?.region ?? '',
        district: geo?.district ?? geo?.subregion ?? '',
        country: geo?.country ?? '',
        country_code: geo?.isoCountryCode ?? '',
        timezone: geo?.timezone ?? '',
      };

      setState({ location: locationData, loading: false, error: null });

      if (user) {
        await supabase.from('user_locations').insert({
          user_id: user.id,
          latitude,
          longitude,
          city: locationData.city,
          district: locationData.district,
          country: locationData.country,
          country_code: locationData.country_code,
          timezone: locationData.timezone,
        });

        await supabase.from('user_profiles').update({
          last_city: locationData.city,
          last_country: locationData.country,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }

      return locationData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lấy vị trí';
      setState(s => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, [user]);

  return { ...state, requestAndStore };
}
