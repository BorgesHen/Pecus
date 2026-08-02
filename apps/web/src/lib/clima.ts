import { api } from './api';

export interface PrevisaoDia {
  data: string;
  tempMax: number;
  tempMin: number;
  probabilidadeChuva: number;
  label: string;
  icone: string;
}

export interface LocalClima {
  nome: string;
  detalhe: string;
  latitude: number;
  longitude: number;
}

export function obterPrevisao(latitude: number, longitude: number) {
  return api<{ dias: PrevisaoDia[] }>(`/clima?lat=${latitude}&lon=${longitude}`);
}

/** Busca cidades pelo nome pra definir a localização da fazenda sem digitar coordenadas. */
export function buscarLocais(termo: string) {
  return api<{ locais: LocalClima[] }>(`/clima/locais?q=${encodeURIComponent(termo)}`);
}
