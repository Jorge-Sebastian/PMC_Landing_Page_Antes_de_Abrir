import type { Signal, DestinationCheck } from './types';

/** Observable evidence and independent verification advice, never a safety promise. */
export function explainSignal(signal: Signal, url: string, destination?: DestinationCheck): Signal {
  const parsed = new URL(url);
  let observedUrl = parsed;
  if (signal.source === 'destination' && destination?.finalUrl) {
    try {
      observedUrl = new URL(destination.finalUrl);
    } catch {
      // Si no se puede interpretar el destino, conservar el enlace escrito.
    }
  }
  const host = signal.source === 'destination' ? destination?.finalHost || observedUrl.hostname : parsed.hostname;
  let evidence = `Dominio observado: ${host}.`;
  let nextStep = 'Compara el dominio con la dirección de la empresa que ya conoces o entra desde su aplicación oficial.';
  if (signal.id === 'sin-conexion-segura') evidence = `La dirección utiliza ${observedUrl.protocol} en lugar de HTTPS.`;
  const inspectedLength = signal.source === 'destination' && destination?.finalUrl ? destination.finalUrl.length : url.length;
  if (signal.id === 'direccion-muy-larga') evidence = `La dirección contiene ${inspectedLength} caracteres. Los enlaces legítimos también pueden ser largos.`;
  if (signal.id === 'otra-web-oculta') evidence = `${parsed.hostname} redirige a ${destination?.finalHost || 'otro dominio'}. Una redirección también puede ser legítima.`;
  if (signal.id === 'dominio-nuevo') evidence = `Edad observada del dominio: ${destination?.domainAgeDays ?? 'desconocida'} días.`;
  if (signal.id === 'pide-datos' && signal.source === 'destination') {
    evidence = 'La comprobación del destino encontró un campo de contraseña en el HTML.';
    nextStep = 'No escribas contraseñas ni códigos; comprueba la solicitud desde la aplicación oficial.';
  }
  if (signal.id === 'archivo-descarga') nextStep = 'Evita descargar el archivo hasta confirmar su origen. La dirección sugiere una descarga, pero no hemos inspeccionado el archivo.';
  if (signal.id === 'hosting-gratuito') evidence += ' Se usa un subdominio de una plataforma de alojamiento compartido; esto también ocurre en sitios legítimos.';
  return { ...signal, params: { ...signal.params, evidence, nextStep } };
}
