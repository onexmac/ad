// Puncheo de formaleta — Vivienda N1 (propuesta v2.0).
// Source: puncheo_formaleta_n1.md, supplied by Marcos. Two punches the
// engineer fills: before the first panel goes up, and before the pour.

export type Photo = { required: boolean; note?: string };

export type Check = {
  id: string;
  title: string;
  /** One line under the title on the home list. */
  sub: string;
  what: string;
  green: string;
  yellow: string;
  red: string;
  tolerance: string;
  photo: Photo;
  /** N/A is allowed only on the checks that say so. */
  na?: boolean;
};

export type Punch = {
  id: "p1" | "p2";
  n: number;
  name: string;
  moment: string;
  checks: Check[];
};

export type Sheet = {
  title: string;
  subtitle: string;
  system: string;
  /** The condominium the house is in, and the house's number: the ficha's header. */
  condo: string;
  house: string;
  /** The house's drawings, opened from the ficha's header. `url` stays null until a file is uploaded. */
  plans: { id: string; name: string; url: string | null }[];
  punches: Punch[];
};

const opt: Photo = { required: false };
const req = (note?: string): Photo => ({ required: true, note });

export const sheet: Sheet = {
  title: "Formaleta",
  subtitle: "Vivienda N1",
  system: "Aluminio Precise Forms · muros sobre losa flotante",
  condo: "Valle Castilla",
  house: "E.11",
  plans: [
    { id: "formaleta", name: "Plano formaleta", url: null },
    { id: "arquitectonico", name: "Plano arquitectónico", url: null },
    { id: "electrico", name: "Plano eléctrico", url: null },
    { id: "mecanico", name: "Plano mecánico", url: null },
  ],
  punches: [
    {
      id: "p1",
      n: 1,
      name: "Pre-armado",
      moment: "Losa recibida, acero y previstas de muro colocados, antes de parar el primer panel.",
      checks: [
        {
          id: "1.1",
          title: "Plomos de losa",
          sub: "Revisión conjunta Losa + Muros, 2 puntos al azar",
          what: "Que el líder de Losa y el líder de Muros revisaron juntos los plomos de la losa antes del armado: borde de losa a plomo y en línea con el trazo, y arranques de acero y previstas dentro del ancho del muro. El ingeniero no repite la medición: confirma que se hizo y mide 2 puntos al azar.",
          green: "Registro con la firma de ambos líderes, anterior al armado, con medidas; los 2 puntos de control coinciden con el registro.",
          yellow: "Revisión hecha, con hallazgos ya corregidos o registro incompleto que se completa en sitio.",
          red: "No hay registro, falta la firma de un líder, hay hallazgos abiertos, o los puntos de control no coinciden.",
          tolerance: "Borde de losa, regla 3/5. Arranques y previstas dentro del espesor del muro, sin forzar el acero. Puntos de control: ±3 mm contra el registro.",
          photo: req("Registro firmado o punto más desfavorable."),
        },
        {
          id: "1.2",
          title: "Trazo",
          sub: "Ejes contra plano, escuadra por diagonales",
          what: "Trazo de muros completo sobre la losa, contra el plano; escuadra de recintos por diagonales.",
          green: "Ejes y diagonales dentro de 3 mm.",
          yellow: "4 a 5 mm, o línea borrosa que se retraza en sitio.",
          red: "Más de 5 mm, o trazo incompleto.",
          tolerance: "Regla 3/5 en posición de ejes y en diferencia de diagonales por recinto.",
          photo: opt,
        },
        {
          id: "1.3",
          title: "Guía de losa",
          sub: "Perímetro completo, a nivel y en línea",
          what: "Guía instalada en la losa en todo el perímetro, donde se sostiene el panel exterior: continua, a nivel, en línea con el trazo.",
          green: "Perímetro completo, nivel y alineación dentro de 3 mm.",
          yellow: "4 a 5 mm, o tramo corto ajustado en sitio.",
          red: "Falta un tramo, más de 5 mm, o guía suelta o deformada.",
          tolerance: "Regla 3/5 en nivel y en alineación.",
          photo: opt,
        },
        {
          id: "1.4",
          title: "Prensas en guía de losa",
          sub: "Cantidad, separación y apriete",
          what: "Prensas que fijan la guía de losa: cantidad, separación y apriete.",
          green: "Todas colocadas a la separación estándar y apretadas.",
          yellow: "Prensas flojas o faltantes puntuales, corregidas en sitio.",
          red: "Tramo de guía sin prensas, o guía que se mueve a mano.",
          tolerance: "Separación máxima SEPARACION_PRENSAS_GUIA (por definir).",
          photo: opt,
        },
        {
          id: "1.5",
          title: "Guía de paredes",
          sub: "Arranque de muros completo sobre el trazo",
          what: "Guía de arranque de los muros: completa, sobre el trazo, firme.",
          green: "Completa y dentro de 3 mm del trazo.",
          yellow: "4 a 5 mm, o tramo ajustado en sitio.",
          red: "Falta un tramo, más de 5 mm, o guía suelta.",
          tolerance: "Regla 3/5 contra el trazo.",
          photo: opt,
        },
        {
          id: "1.6",
          title: "Separadores",
          sub: "Cantidad y estado en el acero de muro",
          what: "Separadores (tipo único) colocados en el acero de muro: cantidad y estado.",
          green: "Densidad estándar en todos los muros; ninguno roto ni suelto.",
          yellow: "Faltantes puntuales repuestos en sitio.",
          red: "Muro sin separadores, o acero que quedaría pegado a la cara del panel.",
          tolerance: "Densidad mínima SEPARADORES_POR_M2 (por definir; referencia externa: 6 por m² de muro).",
          photo: opt,
        },
        {
          id: "1.7",
          title: "Estado físico de formaleta",
          sub: "Caras, rieles y agujeros de pin",
          what: "Paneles que se van a usar: cara sin abolladuras, rieles laterales rectos, agujeros de pin sin ovalar.",
          green: "Todos aptos.",
          yellow: "Daño menor que no afecta el cierre ni la cara; se anota el panel.",
          red: "Abolladura de más de 3 mm, riel doblado o agujero ovalado; el panel se retira antes de armar.",
          tolerance: "Abolladura máxima 3 mm con regla sobre la cara.",
          photo: { required: false, note: "Obligatoria si se retira un panel." },
        },
        {
          id: "1.8",
          title: "Paneles a limpieza profunda",
          sub: "Concreto adherido: marcar y separar",
          what: "Detección y marcado de paneles con concreto adherido en cara o rieles, para enviarlos a limpieza profunda.",
          green: "Ningún panel lo requiere.",
          yellow: "Paneles detectados, marcados y fotografiados; se usan en este ciclo y salen a limpieza al desencofrar. Se registra la cantidad.",
          red: "Panel con concreto en rieles que impide cerrar la junta, o costra en la cara; se retira antes de armar.",
          tolerance: "No aplica.",
          photo: req("Por cada panel marcado."),
        },
        {
          id: "1.9",
          title: "Aplicación de desmoldante",
          sub: "Capa fina en la cara de contacto",
          what: "Desmoldante aplicado a la cara de contacto antes de colocar el panel.",
          green: "Capa fina y uniforme en todos los paneles; nada sobre el acero ni sobre la junta con la losa.",
          yellow: "Paneles sin cubrir o con exceso, corregidos en sitio.",
          red: "Paneles colocados sin desmoldante, o acero contaminado.",
          tolerance: "No aplica.",
          photo: opt,
        },
        {
          id: "1.10",
          title: "Nivel de escalera de trabajo",
          sub: "Base firme, nivelada y asegurada",
          what: "Escalera de trabajo sobre base firme, a nivel y asegurada.",
          green: "Nivelada, asegurada y sin daños.",
          yellow: "Se nivela o asegura en sitio.",
          red: "Base inestable, escalera dañada o sin asegurar.",
          tolerance: "No aplica.",
          photo: opt,
        },
      ],
    },
    {
      id: "p2",
      n: 2,
      name: "Pre-chorrea",
      moment: "Formaleta armada y ajustada, antes de liberar la chorrea.",
      checks: [
        {
          id: "2.1",
          title: "Modulación según plano",
          sub: "Paneles y piezas especiales según plano",
          what: "Cada panel en la posición del plano de modulación; piezas especiales (marcadas en rojo en el plano, ADJ, SPCL) en su sitio; sin rellenos improvisados.",
          green: "100 % conforme al plano.",
          yellow: "Sustitución equivalente aprobada por el ingeniero y anotada.",
          red: "Pieza especial fuera de lugar, relleno improvisado o sustitución sin aprobar.",
          tolerance: "No aplica.",
          photo: req("De cada pieza especial."),
        },
        {
          id: "2.2",
          title: "5 cuñas por unión",
          sub: "5 cuñas a martillo en cada unión",
          what: "Cada unión entre paneles de altura completa con 5 cuñas, asentadas a martillo.",
          green: "Todas las uniones con 5 cuñas firmes.",
          yellow: "Uniones puntuales incompletas o cuñas flojas, corregidas en sitio.",
          red: "Uniones con menos de 5 de forma repetida, o cuñas flojas generalizadas.",
          tolerance: "5 por unión, sin excepción. Piezas cortas (dinteles): según estándar Adelante.",
          photo: opt,
        },
        {
          id: "2.3",
          title: "Revisión de corbatas",
          sub: "Todas las posiciones, largo correcto",
          what: "Corbatas en todas las posiciones, del largo correcto, sin dobleces ni daño.",
          green: "Cero faltantes, todas en buen estado.",
          yellow: "Faltantes puntuales repuestas en sitio.",
          red: "Corbata faltante que ya no se puede colocar, corbata dañada o de largo incorrecto.",
          tolerance: "Cero faltantes.",
          photo: opt,
        },
        {
          id: "2.4",
          title: "Alineadores",
          sub: "Líneas continuas, muro a hilo",
          what: "Líneas de alineador completas, continuas a través de las uniones y firmes; muro a hilo.",
          green: "Todas las líneas del estándar colocadas; muro a hilo dentro de 3 mm.",
          yellow: "4 a 5 mm, o alineador flojo ajustado en sitio.",
          red: "Falta una línea, alineador cortado en una unión, o más de 5 mm.",
          tolerance: "Regla 3/5 a hilo. Cantidad de líneas LINEAS_ALINEADOR (por definir; referencia externa: 2 líneas, base y corona, en una sola cara).",
          photo: opt,
        },
        {
          id: "2.5",
          title: "Tensores / aplomadores",
          sub: "Pinados, anclados y a la separación",
          what: "Tensores pinados al panel, anclados firmes y a la separación definida.",
          green: "Todos anclados y trabados, a la separación estándar.",
          yellow: "Tensor flojo o faltante puntual, corregido en sitio.",
          red: "Muro sin tensores, anclaje suelto o separación mayor que la definida.",
          tolerance: "Separación máxima SEPARACION_TENSORES (por definir; propuesta 2,5 m y al menos uno por muro suelto).",
          photo: opt,
        },
        {
          id: "2.6",
          title: "Plomo de esquinas",
          sub: "Cada esquina en dos direcciones",
          what: "Plomo de cada esquina en las dos direcciones.",
          green: "Hasta 3 mm.",
          yellow: "4 a 5 mm; se registra el valor.",
          red: "Más de 5 mm.",
          tolerance: "Regla 3/5 en la altura del panel. La app pide el valor más alto medido.",
          photo: req("Nivel sobre la esquina más desfavorable."),
        },
        {
          id: "2.7",
          title: "Plomo de paños",
          sub: "Extremos y centro de muros > 1,5 m",
          what: "Plomo en los extremos y al centro de cada muro de más de 1,5 m.",
          green: "Hasta 3 mm.",
          yellow: "4 a 5 mm; se registra el valor.",
          red: "Más de 5 mm.",
          tolerance: "Regla 3/5 en la altura del panel. La app pide el valor más alto medido.",
          photo: opt,
        },
        {
          id: "2.8",
          title: "Alineación de tapas",
          sub: "Tapas a ras y pinadas",
          what: "Tapas de marcos y de extremos de muro a ras con los paneles y pinadas.",
          green: "A ras, escalón de hasta 2 mm, todas pinadas.",
          yellow: "Escalón de 3 a 5 mm corregido en sitio.",
          red: "Escalón de más de 5 mm, o tapa suelta.",
          tolerance: "Escalón máximo 2 mm.",
          photo: opt,
        },
        {
          id: "2.9",
          title: "Marcos — medidas",
          sub: "Ancho y alto libre contra plano",
          what: "Ancho y alto libre de cada marco contra el plano.",
          green: "De 0 a +3 mm.",
          yellow: "De +4 a +5 mm.",
          red: "Menor que la medida del plano, o más de +5 mm.",
          tolerance: "−0 / +5 mm. La app pide ancho y alto por marco.",
          photo: req("Cinta sobre el marco de la puerta principal."),
        },
        {
          id: "2.10",
          title: "Marcos — escuadra",
          sub: "Diferencia entre diagonales",
          what: "Diferencia entre las dos diagonales de cada marco.",
          green: "Hasta 3 mm.",
          yellow: "4 a 5 mm.",
          red: "Más de 5 mm.",
          tolerance: "Regla 3/5.",
          photo: opt,
        },
        {
          id: "2.11",
          title: "Marcos — plomo",
          sub: "Dos jambas en dos direcciones",
          what: "Plomo de las dos jambas de cada marco, en las dos direcciones.",
          green: "Hasta 3 mm.",
          yellow: "4 a 5 mm.",
          red: "Más de 5 mm.",
          tolerance: "Regla 3/5 en la altura de la jamba.",
          photo: opt,
        },
        {
          id: "2.12",
          title: "Tornillos en marcos",
          sub: "Fijación de marcos completa",
          what: "Todos los tornillos de fijación de los marcos colocados y apretados.",
          green: "100 % colocados y firmes.",
          yellow: "Faltantes o flojos puntuales, corregidos en sitio.",
          red: "Marco que se mueve a mano, o tornillos faltantes que no se pueden reponer.",
          tolerance: "Cero faltantes.",
          photo: opt,
        },
        {
          id: "2.13",
          title: "Tornillos en puntos de presión",
          sub: "Un tornillo por punto de presión",
          what: "Tornillo colocado y apretado en cada punto de presión definido.",
          green: "100 % de los puntos.",
          yellow: "Faltantes puntuales, corregidos en sitio.",
          red: "Punto de presión sin tornillo que ya no se puede colocar.",
          tolerance: "Cero faltantes.",
          photo: opt,
        },
        {
          id: "2.14",
          title: "Tacos de madera",
          sub: "Todas las posiciones, firmes y a medida",
          what: "Tacos en todas las posiciones definidas, firmes y a medida.",
          green: "Todos colocados y firmes.",
          yellow: "Taco flojo o faltante puntual, corregido en sitio.",
          red: "Posición sin taco, o taco que no calza.",
          tolerance: "Cero faltantes.",
          photo: opt,
          na: true,
        },
        {
          id: "2.15",
          title: "Prensas de cielo",
          sub: "Posiciones del estándar, apretadas",
          what: "Prensas de cielo en todas las posiciones del estándar y apretadas.",
          green: "Todas colocadas y firmes.",
          yellow: "Prensa floja o faltante puntual, corregida en sitio.",
          red: "Tramo sin prensas, o prensa que no sujeta.",
          tolerance: "Cantidad y separación SEPARACION_PRENSAS_CIELO (por definir).",
          photo: opt,
          na: true,
        },
        {
          id: "2.16",
          title: "Replomo final",
          sub: "Segundo plomo antes de chorrear",
          what: "Segundo plomo de esquinas y marcos, después de todos los ajustes y justo antes de la chorrea.",
          green: "Hasta 3 mm, sin cambio de más de 2 mm contra 2.6 y 2.11.",
          yellow: "4 a 5 mm, o cambio de más de 2 mm; se revisan tensores y se vuelve a medir.",
          red: "Más de 5 mm.",
          tolerance: "Regla 3/5. La app pide el valor más alto medido.",
          photo: req(),
        },
        {
          id: "2.17",
          title: "Seguridad de la chorrea",
          sub: "Barandas, accesos y vigía designado",
          what: "Plataformas con tablón, rodapié, baranda intermedia y baranda superior; accesos asegurados; nadie parado sobre alineadores; persona designada para vigilar la formaleta durante la chorrea, con cuñas y pines de repuesto.",
          green: "Todo colocado y vigía designado, con nombre registrado.",
          yellow: "Faltante menor corregido antes de iniciar.",
          red: "Plataforma sin baranda, acceso inseguro o sin vigía. No se chorrea.",
          tolerance: "No aplica.",
          photo: req("Plataforma con barandas."),
        },
      ],
    },
  ],
};
