import { BadRequestException } from '@nestjs/common';

/** Códigos WMO (usados pela Open-Meteo) traduzidos pra algo exibível. */
const DESCRICAO_POR_CODIGO: Record<number, { label: string; icone: string }> = {
  0: { label: 'Céu limpo', icone: '☀️' },
  1: { label: 'Poucas nuvens', icone: '🌤️' },
  2: { label: 'Parcialmente nublado', icone: '⛅' },
  3: { label: 'Nublado', icone: '☁️' },
  45: { label: 'Neblina', icone: '🌫️' },
  48: { label: 'Neblina com geada', icone: '🌫️' },
  51: { label: 'Garoa leve', icone: '🌦️' },
  53: { label: 'Garoa', icone: '🌦️' },
  55: { label: 'Garoa forte', icone: '🌦️' },
  61: { label: 'Chuva leve', icone: '🌧️' },
  63: { label: 'Chuva', icone: '🌧️' },
  65: { label: 'Chuva forte', icone: '🌧️' },
  71: { label: 'Neve leve', icone: '🌨️' },
  73: { label: 'Neve', icone: '🌨️' },
  75: { label: 'Neve forte', icone: '🌨️' },
  80: { label: 'Aguaceiros leves', icone: '🌦️' },
  81: { label: 'Aguaceiros', icone: '🌧️' },
  82: { label: 'Aguaceiros fortes', icone: '🌧️' },
  95: { label: 'Trovoada', icone: '⛈️' },
  96: { label: 'Trovoada com granizo', icone: '⛈️' },
  99: { label: 'Trovoada forte com granizo', icone: '⛈️' },
};

function descreverCodigo(codigo: number) {
  return DESCRICAO_POR_CODIGO[codigo] ?? { label: 'Sem dados', icone: '❓' };
}

export interface PrevisaoDia {
  data: string;
  tempMax: number;
  tempMin: number;
  probabilidadeChuva: number;
  label: string;
  icone: string;
}

export async function previsao(lat: number, lon: number): Promise<{ dias: PrevisaoDia[] }> {
  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new BadRequestException('Coordenadas inválidas.');
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!resp || !resp.ok) {
    throw new BadRequestException('Não foi possível obter a previsão do tempo agora.');
  }

  const dados = await resp.json();
  const dias: PrevisaoDia[] = dados.daily.time.map((data: string, i: number) => {
    const { label, icone } = descreverCodigo(dados.daily.weathercode[i]);
    return {
      data,
      tempMax: dados.daily.temperature_2m_max[i],
      tempMin: dados.daily.temperature_2m_min[i],
      probabilidadeChuva: dados.daily.precipitation_probability_max[i],
      label,
      icone,
    };
  });

  return { dias };
}
