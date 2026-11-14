/** Un trozo de texto del cuerpo: texto plano, un término del glosario (rojo y
 *  tocable) o el nombre de un personaje histórico (resaltado, no tocable). Los
 *  personajes son materia de examen: el temario pide "características,
 *  personajes y consecuencias". */
export type BodyPart = string | { term: string } | { name: string };

export interface Slide {
  image: string;
  title: string;
  body?: BodyPart[];
  /** A drawn diagram rather than a photograph: shown whole (letterboxed on
   *  black) instead of cropped to fill, and it does not parallax. */
  diagram?: boolean;
  /** Caption shown while peeking (tap-and-hold) the photo — what the image is
   *  and its real source. Researched per image; see git history for provenance. */
  info?: string;
}

export interface Topic {
  slug: string;
  label: string;
  thumbnail: string;
  comingSoon?: boolean;
  slides: Slide[];
  glossary: Record<string, string>;
}

export interface Materia {
  slug: string;
  label: string;
  /** Accent color for the Clear-style expanding materia row. */
  accent: string;
  topics: Topic[];
  /** Materia with no content yet (expands to an empty "próximamente" state). */
  comingSoon?: boolean;
}

const socialesI: Topic[] = [
  {
    slug: "imperialismo-europeo",
    label: "Imperialismo Europeo",
    thumbnail: "/kit/histok/images/imperialismo.jpg",
    glossary: {
      imperialismo:
        "Política de un Estado poderoso de extender su dominio sobre otros territorios y pueblos, controlando su economía, su política y sus recursos.",
      colonialismo:
        "Ocupar y administrar directamente un territorio ajeno, imponiendo el gobierno, la cultura y las leyes de la potencia que coloniza.",
      nacionalismo:
        "La idea de que una nación —un pueblo con historia, cultura e identidad común— debe defenderse y valorarse, muchas veces por encima de las demás.",
      "Revolución Industrial":
        "Transformación del siglo XIX en la que las fábricas y las máquinas multiplicaron la producción, creando una enorme necesidad de materias primas y nuevos mercados.",
      "Conferencia de Berlín":
        "Reunión de 1884-1885 en la que las potencias europeas se repartieron África entre ellas, trazando fronteras sin tomar en cuenta a sus pueblos.",
    },
    slides: [
      {
        image: "/kit/histok/images/imperialismo.jpg",
        title: "Imperialismo Europeo",
        info: "Ceremonia imperial británica en la India (un Durbar de Delhi): tropas y multitudes rodean el pabellón real, símbolo del poder colonial. Fotografía de inicios del siglo XX.",
      },
      {
        image: "/kit/histok/images/imp-rhodes.jpg",
        title: "¿Qué fue el imperialismo?",
        body: [
          "Durante los siglos XIX y XX, las potencias europeas se expandieron por África, Asia y Oceanía. El ",
          { term: "imperialismo" },
          " era dominar esos territorios para extraer sus recursos y ganar poder.",
        ],
        info: "«El Coloso de Rhodes»: caricatura de Cecil Rhodes a horcajadas sobre África, de El Cabo a El Cairo. Revista Punch, 10 de diciembre de 1892.",
      },
      {
        image: "/kit/histok/images/imp-delacroix.jpg",
        title: "Colonialismo y nacionalismo",
        body: [
          "El ",
          { term: "colonialismo" },
          " era la ocupación directa de un territorio. Y el ",
          { term: "nacionalismo" },
          " —el orgullo por la propia nación— alimentaba la rivalidad entre las potencias.",
        ],
        info: "«La libertad guiando al pueblo», de Eugène Delacroix (1830). Alegoría de la Revolución de Julio en Francia; ilustra el nacionalismo. Museo del Louvre, París.",
      },
      {
        image: "/kit/histok/images/imp-menzel.jpg",
        title: "El motor: la Revolución Industrial",
        body: [
          "La ",
          { term: "Revolución Industrial" },
          " llenó a Europa de fábricas que necesitaban materias primas baratas y nuevos mercados. Las colonias ofrecían ambas cosas.",
        ],
        info: "«La fábrica de laminado de hierro» («Eisenwalzwerk»), de Adolph Menzel (1872-1875). Retrata el trabajo industrial de la época. Alte Nationalgalerie, Berlín.",
      },
      {
        image: "/kit/histok/images/imp-berlin.jpg",
        title: "El reparto del mundo",
        body: [
          "En la ",
          { term: "Conferencia de Berlín" },
          " (1884) las potencias dividieron África sobre un mapa, sin consultar a nadie. El resultado: fronteras artificiales y rivalidades que años después estallarían en guerra.",
        ],
        info: "Sesión de la Conferencia de Berlín (1884-1885), donde las potencias europeas repartieron África. Al fondo, un mapa del continente; preside Bismarck. Grabado de época.",
      },
    ],
  },
  {
    slug: "primera-guerra-mundial",
    label: "Primera Guerra Mundial",
    thumbnail: "/kit/histok/images/primera-guerra.jpg",
    glossary: {
      nacionalismo:
        "La idea de que una nación debe defenderse y valorarse por encima de las demás; llevado al extremo, alimenta rivalidades y conflictos.",
      "Paz Armada":
        "Periodo previo a 1914 en el que las potencias europeas, sin estar en guerra, competían acumulando armas y ejércitos cada vez más grandes.",
      Balcanes:
        "Región del sureste de Europa con muchos pueblos y tensiones; era tan inestable que se le llamó «el polvorín de Europa».",
      "guerra de trincheras":
        "Combate en el que los ejércitos se enterraban en largas zanjas y avanzaban muy poco durante meses, con enormes pérdidas humanas.",
      "Tratado de Versalles":
        "Tratado de 1919 que puso fin a la guerra e impuso a Alemania duras condiciones: pérdida de territorios, desarme y una enorme deuda de guerra.",
    },
    slides: [
      {
        image: "/kit/histok/images/primera-guerra.jpg",
        title: "Primera Guerra Mundial",
        info: "Fotografía aérea de una red de trincheras del frente occidental, con anotaciones en inglés («dugouts», «communication trench»). Primera Guerra Mundial (1914-1918).",
      },
      {
        image: "/kit/histok/images/pgm-dreadnought.jpg",
        title: "Las causas de fondo",
        body: [
          "Rivalidades imperialistas, ",
          { term: "nacionalismo" },
          ", una carrera de armas (la ",
          { term: "Paz Armada" },
          ") y un sistema de alianzas dividieron Europa. Los ",
          { term: "Balcanes" },
          " eran el «polvorín».",
        ],
        info: "El acorazado británico HMS Dreadnought (1906), cuyo diseño revolucionario desató la carrera naval anglo-alemana previa a la guerra.",
      },
      {
        image: "/kit/histok/images/pgm-princip.jpg",
        title: "La chispa (1914)",
        body: [
          "El asesinato del archiduque Francisco Fernando en Sarajevo fue la causa inmediata: en pocas semanas, las alianzas arrastraron a toda Europa a la guerra.",
        ],
        info: "Sarajevo, 28 de junio de 1914: la policía detiene a un sospechoso tras el atentado contra Francisco Fernando. Durante años se creyó que era Gavrilo Princip, pero era otro detenido.",
      },
      {
        image: "/kit/histok/images/pgm-trincheras.jpg",
        title: "Las fases",
        body: [
          "Empezó con una guerra de movimientos rápida, pero se estancó en una larga ",
          { term: "guerra de trincheras" },
          ". El final llegó con la entrada de EE. UU. y la salida de Rusia.",
        ],
        info: "Soldados del Regimiento de Cheshire en una trinchera del Somme; un centinela vigila mientras sus compañeros descansan. Julio de 1916.",
      },
      {
        image: "/kit/histok/images/tratado-versalles.jpg",
        title: "Tratados y consecuencias",
        body: [
          "El ",
          { term: "Tratado de Versalles" },
          " (1919) castigó duramente a Alemania. Cuatro imperios desaparecieron y quedó un resentimiento que alimentaría la siguiente guerra.",
        ],
        info: "La Galería de los Espejos de Versalles repleta de asistentes durante la firma del Tratado de Versalles, que puso fin a la guerra. 28 de junio de 1919.",
      },
    ],
  },
  {
    slug: "revolucion-rusa",
    label: "Revolución Rusa",
    thumbnail: "/kit/histok/images/revolucion-rusa.jpg",
    glossary: {
      zar: "Título del emperador que gobernaba Rusia con poder absoluto antes de la revolución.",
      "Primera Guerra Mundial":
        "Conflicto global entre 1914 y 1918; su desgaste militar y económico hundió al régimen zarista.",
      bolcheviques:
        "Partido revolucionario comunista, liderado por Lenin, que tomó el poder en Rusia en octubre de 1917.",
      Lenin:
        "Líder de los bolcheviques y primer jefe de la Rusia soviética; dirigió la Revolución de Octubre de 1917.",
      comunismo:
        "Sistema político y económico que busca eliminar la propiedad privada y que el Estado controle la producción para repartir la riqueza.",
      URSS:
        "Unión de Repúblicas Socialistas Soviéticas: el Estado comunista creado en 1922 alrededor de Rusia, que duró hasta 1991.",
      Stalin:
        "Líder de la URSS tras la muerte de Lenin; gobernó con un régimen totalitario e industrializó el país a la fuerza.",
    },
    slides: [
      {
        image: "/kit/histok/images/revolucion-rusa.jpg",
        title: "Revolución Rusa",
        info: "Lenin arenga a las tropas del Ejército Rojo en la plaza Sverdlov de Moscú, 5 de mayo de 1920. Trotsky aparece junto a la tribuna (luego borrado en versiones estalinistas).",
      },
      {
        image: "/kit/histok/images/rr-zar.jpg",
        title: "La Rusia de los zares",
        body: [
          "Rusia era un imperio atrasado gobernado por el ",
          { term: "zar" },
          " Nicolás II. Las derrotas y el hambre de la ",
          { term: "Primera Guerra Mundial" },
          " terminaron por hundir al régimen.",
        ],
        info: "El zar Nicolás II de Rusia con uniforme militar, en un retrato firmado y fechado en 1898.",
      },
      {
        image: "/kit/histok/images/rr-1917.jpg",
        title: "1917: dos revoluciones",
        body: [
          "En febrero cae el zar. En octubre, los ",
          { term: "bolcheviques" },
          " de ",
          { term: "Lenin" },
          " toman el poder con la promesa de «paz, pan y tierra» e implantan el ",
          { term: "comunismo" },
          ".",
        ],
        info: "La multitud huye tras la represión con ametralladoras en la avenida Nevski de Petrogrado, durante las Jornadas de Julio, 4 de julio de 1917.",
      },
      {
        image: "/kit/histok/images/rr-stalin.jpg",
        title: "Nace la URSS",
        body: [
          "En 1922 se crea la ",
          { term: "URSS" },
          ". Tras la muerte de Lenin, ",
          { term: "Stalin" },
          " toma el control con mano de hierro. Nace la primera gran potencia comunista.",
        ],
        info: "Iósif Stalin en un retrato de los primeros años soviéticos (hacia 1918), con gorra militar con estrella roja.",
      },
    ],
  },
  {
    slug: "gran-depresion",
    label: "La Gran Depresión",
    thumbnail: "/kit/histok/images/gran-depresion.jpg",
    glossary: {
      bursátil:
        "Todo lo relacionado con la Bolsa de valores, el lugar donde se compran y venden las acciones de las empresas.",
      especulación:
        "Comprar algo (como acciones) solo para revenderlo más caro y ganar dinero rápido, asumiendo mucho riesgo.",
      inflación:
        "Subida general y sostenida de los precios, que hace que el dinero valga menos y compre menos cosas.",
      escasez:
        "Falta de productos básicos disponibles, que suele encarecerlos y dificultar la vida diaria.",
    },
    slides: [
      {
        image: "/kit/histok/images/gran-depresion.jpg",
        title: "La Gran Depresión",
        info: "Fila del pan frente a la panadería Fleischmann en Nueva York, 2 de enero de 1908 (colección Bain, Biblioteca del Congreso de EE. UU.).",
      },
      {
        image: "/kit/histok/images/gd-crack.jpg",
        title: "El crack del 29",
        body: [
          "El 29 de octubre de 1929, la Bolsa de Nueva York se desplomó y millones perdieron sus ahorros en el mercado ",
          { term: "bursátil" },
          ". Detrás había años de ",
          { term: "especulación" },
          " y una burbuja que reventó.",
        ],
        info: "Multitudes se agolpan en Wall Street, junto a la Bolsa de Nueva York, durante el crac bursátil de octubre de 1929.",
      },
      {
        image: "/kit/histok/images/gd-impacto.jpg",
        title: "El impacto",
        body: [
          "Llegaron el desempleo masivo, la ",
          { term: "inflación" },
          ", la ",
          { term: "escasez" },
          " y la pobreza. La crisis se extendió desde Estados Unidos hasta Europa y el resto del mundo.",
        ],
        info: "«Madre migrante»: Florence Owens Thompson, jornalera de 32 años, y sus hijos en Nipomo, California. Foto de Dorothea Lange, marzo de 1936.",
      },
      {
        image: "/kit/histok/images/gd-consecuencias.jpg",
        title: "Consecuencias",
        body: [
          "Filas para conseguir comida, desconfianza en el sistema económico y un clima de desesperación que facilitó el ascenso de líderes autoritarios.",
        ],
        info: "Desempleados hacen fila en el comedor de beneficencia abierto por Al Capone en Chicago: «Sopa, café y donas gratis». Febrero de 1931.",
      },
    ],
  },
  {
    slug: "segunda-guerra-mundial",
    label: "Segunda Guerra Mundial",
    thumbnail: "/kit/histok/images/cover-wwii.jpg",
    glossary: {
      "Benito Mussolini":
        "Líder del Partido Fascista italiano y jefe de gobierno de Italia entre 1922 y 1943. Aliado de Hitler durante la Segunda Guerra Mundial.",
      nacionalismo:
        "La idea de que una nación debe defenderse y valorarse por encima de las demás; los regímenes fascistas la llevaron al extremo.",
      fascismo:
        "Movimiento político autoritario y nacionalista, surgido en Italia con Mussolini, que exalta al Estado y al líder y rechaza la democracia.",
      nazismo:
        "La versión alemana del fascismo, liderada por Hitler, basada en el nacionalismo extremo, el racismo y la expansión territorial.",
      Holocausto:
        "Exterminio sistemático de unos seis millones de judíos —y de otros grupos— por parte del régimen nazi durante la guerra.",
    },
    slides: [
      {
        image: "/kit/histok/images/cover-wwii.jpg",
        title: "Segunda Guerra Mundial",
        info: "«Hacia las fauces de la muerte»: soldados de EE. UU. desembarcan bajo fuego en la playa Omaha, Normandía, el Día D, 6 de junio de 1944.",
      },
      {
        image: "/kit/histok/images/fascismo-nazismo.jpg",
        title: "El ascenso del fascismo y el nazismo",
        body: [
          "Regímenes como el de ",
          { term: "Benito Mussolini" },
          " en Italia y Adolf Hitler en Alemania promovieron el militarismo, el ",
          { term: "nacionalismo" },
          " extremo y el ",
          { term: "fascismo" },
          ".",
        ],
        info: "Mussolini (izq.) y Hitler pasan revista a las tropas: los líderes del fascismo italiano y del nazismo alemán, aliados del Eje.",
      },
      {
        image: "/kit/histok/images/sgm-jjoo.jpg",
        title: "Caso: los Juegos Olímpicos de 1936",
        body: [
          "Hitler usó los Juegos de Berlín como propaganda del ",
          { term: "nazismo" },
          ". Pero el atleta afroamericano Jesse Owens ganó cuatro oros y desmintió el mito de la «superioridad» aria.",
        ],
        info: "Jesse Owens, atleta afroamericano de EE. UU. que ganó cuatro medallas de oro en los Juegos Olímpicos de Berlín 1936.",
      },
      {
        image: "/kit/histok/images/invasion-polonia.jpg",
        title: "La chispa (1939)",
        body: [
          "El 1 de setiembre de 1939, Alemania invadió Polonia sin declaración previa. Dos días después, Francia y el Reino Unido le declararon la guerra.",
        ],
        info: "Soldados alemanes rompen la barrera fronteriza con Polonia el 1 de septiembre de 1939: comienza la Segunda Guerra Mundial. (Foto propagandística escenificada.)",
      },
      {
        image: "/kit/histok/images/sgm-consecuencias.jpg",
        title: "Consecuencias",
        body: [
          "Decenas de millones de muertos, el horror del ",
          { term: "Holocausto" },
          " y una Europa que las potencias vencedoras se repartieron, dando inicio a la Guerra Fría.",
        ],
        info: "Conferencia de Yalta, febrero de 1945: Churchill, Roosevelt y Stalin acuerdan cómo repartir y reorganizar Europa tras la guerra.",
      },
    ],
  },
  {
    slug: "guerra-fria",
    label: "Guerra Fría",
    thumbnail: "/kit/histok/images/guerra-fria.jpg",
    glossary: {
      capitalismo:
        "Sistema económico basado en la propiedad privada y el mercado, donde empresas y personas compiten libremente para obtener ganancias.",
      comunismo:
        "Sistema en el que el Estado controla la economía y la propiedad para repartir la riqueza; era el modelo de la URSS.",
      "Muro de Berlín":
        "Muro levantado en 1961 que dividió la ciudad de Berlín y se volvió el símbolo de la separación entre el bloque comunista y el capitalista.",
      "Primavera de Praga":
        "Intento de Checoslovaquia, en 1968, de suavizar el comunismo; fue aplastado por la invasión soviética.",
      "Crisis de los Misiles":
        "Enfrentamiento de 1962 en el que la URSS instaló misiles nucleares en Cuba y el mundo estuvo al borde de una guerra nuclear.",
      "carrera espacial":
        "Competencia entre EE. UU. y la URSS por dominar el espacio: incluyó el primer satélite (Sputnik, 1957) y la llegada del hombre a la Luna (1969).",
    },
    slides: [
      {
        image: "/kit/histok/images/guerra-fria.jpg",
        title: "Guerra Fría",
        info: "Reapertura de la Puerta de Brandeburgo en Berlín, 22 de diciembre de 1989, bajo la lluvia: el símbolo del fin de la división de la Guerra Fría.",
      },
      {
        image: "/kit/histok/images/gf-bipolar.jpg",
        title: "Un mundo bipolar",
        body: [
          "Estados Unidos (",
          { term: "capitalismo" },
          ") y la URSS (",
          { term: "comunismo" },
          ") se enfrentaron sin combatir directamente. El ",
          { term: "Muro de Berlín" },
          " (1961) partió el mundo en dos bloques.",
        ],
        info: "Obreros de Alemania Oriental construyen el Muro de Berlín con una grúa, 1961. La ciudad quedó dividida entre los dos bloques.",
      },
      {
        image: "/kit/histok/images/gf-conflictos.jpg",
        title: "Conflictos indirectos",
        body: [
          "Los bloques chocaron en otros países: la Guerra de Corea, la de Vietnam, la ",
          { term: "Primavera de Praga" },
          " y la invasión de Afganistán.",
        ],
        info: "Helicópteros UH-1 «Huey» y soldados estadounidenses en la Guerra de Vietnam, 1966: un conflicto indirecto de la Guerra Fría.",
      },
      {
        image: "/kit/histok/images/gf-abismo.jpg",
        title: "Al borde del abismo",
        body: [
          "Durante trece días de octubre de 1962, Kennedy y Jruschov negociaron por telegrama mientras sus ejércitos esperaban la orden. De ahí salió la ",
          { term: "Crisis de los Misiles" },
          ", el momento más tenso de todo el periodo, y también el teléfono rojo que conectó directamente Washington con Moscú.",
        ],
        info: "Foto aérea de EE. UU. de un emplazamiento de misiles soviéticos en Cuba (Los Palacios), octubre de 1962: la Crisis de los Misiles.",
      },
      {
        image: "/kit/histok/images/gf-espacial.jpg",
        title: "La carrera espacial",
        body: [
          "La ",
          { term: "carrera espacial" },
          " y nuclear llevó a la URSS a lanzar el Sputnik y a EE. UU. a la Luna en 1969. La Guerra Fría terminó en 1991, con el fin de la Unión Soviética.",
        ],
        info: "El astronauta Buzz Aldrin sobre la Luna, misión Apolo 11, 20 de julio de 1969. El punto culminante de la carrera espacial.",
      },
    ],
  },
];

// --- Cívica II ------------------------------------------------------------
// Photos: Wikimedia Commons, all public domain / CC0 / CC BY / CC BY-SA, each
// verified on its file page. One distinct Costa Rican image per slide.
//   Corte Suprema — Lex.mercurio · Casa Presidencial — MadriCR · Casa Amarilla —
//   Rodtico21 · Municipalidad de Montes de Oca — Haakon S. Krohn · Teatro
//   Nacional — AndSalx95 · Museo Nacional · Estatua de Figueres y Monumento
//   Nacional — Mariordo · «La destrucción de las armas» — Ll1324 (CC0) ·
//   Asamblea Legislativa · Hospital Calderón Guardia — Antonio Solera · marcha —
//   Leo Jiménez · Banco Central — MyCatIsAChonk · TSE — Tucancillo · Juan
//   Santamaría — Rodrigo Fernández · Parque Morazán — Rodtico21 · Día del
//   Indígena — MJPRDP.
// NOTE: the Banco Central file is misnamed "National Bank of Costa Rica" on
// Commons; the building's own inscription reads BANCO CENTRAL, which is what the
// caption says.
const CIV_CORTE = "/kit/histok/images/civ-constitucionalismo.jpg";
const CIV_PRESIDENCIAL = "/kit/histok/images/civ-consti-2.jpg";
const CIV_CASA_AMARILLA = "/kit/histok/images/civ-consti-3.jpg";
const CIV_MUNICIPALIDAD = "/kit/histok/images/civ-consti-4.jpg";
const CIV_TEATRO = "/kit/histok/images/civ-consti-5.jpg";
const CIV_MUSEO = "/kit/histok/images/civ-ejercito.jpg";
const CIV_FIGUERES = "/kit/histok/images/civ-ejercito-2.jpg";
const CIV_ARMAS = "/kit/histok/images/civ-ejercito-3.jpg";
const CIV_MONUMENTO = "/kit/histok/images/civ-ejercito-4.jpg";
const CIV_ASAMBLEA = "/kit/histok/images/civ-estado.jpg";
const CIV_HOSPITAL = "/kit/histok/images/civ-estado-2.jpg";
const CIV_MARCHA = "/kit/histok/images/civ-estado-3.jpg";
const CIV_BANCO = "/kit/histok/images/civ-estado-4.jpg";
const CIV_TSE = "/kit/histok/images/civ-cultura.jpg";
const CIV_SANTAMARIA = "/kit/histok/images/civ-cultura-2.jpg";
const CIV_MORAZAN = "/kit/histok/images/civ-cultura-3.jpg";
const CIV_INDIGENA = "/kit/histok/images/civ-cultura-4.jpg";

const civicaII: Topic[] = [
  {
    slug: "constitucionalismo-poderes",
    label: "Constitucionalismo y poderes del Estado",
    thumbnail: CIV_CORTE,
    glossary: {
      constitucionalismo:
        "Sistema en el que el poder del Estado se organiza y se LIMITA mediante una Constitución que protege los derechos de las personas.",
      presidencialismo:
        "Sistema de gobierno en el que el presidente es a la vez jefe de Estado y jefe de Gobierno, elegido por el pueblo.",
      "Poder Ejecutivo":
        "Rama del Estado que gobierna y administra el país; en Costa Rica la encabeza el presidente de la República.",
      "Poder Legislativo":
        "Rama del Estado que hace las leyes; en Costa Rica es la Asamblea Legislativa.",
      "Poder Judicial":
        "Rama del Estado que administra justicia e interpreta las leyes; su cabeza es la Corte Suprema de Justicia.",
      "rendición de cuentas":
        "Obligación de las autoridades de informar y responder por sus decisiones y por el uso de los recursos públicos.",
      "gobiernos locales":
        "Las municipalidades: el gobierno de cada cantón, que administra los asuntos más cercanos a la comunidad.",
      "institucionalidad democrática":
        "Conjunto de instituciones y reglas que sostienen la democracia y el equilibrio entre los poderes del Estado.",
    },
    slides: [
      {
        image: CIV_CORTE,
        title: "Constitucionalismo y poderes del Estado",
        info: "Edificio de la Corte Suprema de Justicia, San José, sede del Poder Judicial de Costa Rica.",
      },
      {
        image: CIV_PRESIDENCIAL,
        title: "Constitucionalismo y presidencialismo",
        body: [
          "Costa Rica no inventó su forma de gobierno: la heredó de dos ideas del siglo XVIII. El ",
          { term: "constitucionalismo" },
          " nació de las revoluciones que quisieron ponerle freno a los reyes; el ",
          { term: "presidencialismo" },
          " se copió de Estados Unidos, y por eso aquí no existe la figura aparte de un primer ministro.",
        ],
        info: "Fachada de la Casa Presidencial de Costa Rica, sede del Poder Ejecutivo, con un estanque de nenúfares al frente y la bandera nacional izada.",
      },
      {
        image: CIV_ASAMBLEA,
        title: "Los tres poderes",
        body: [
          "El poder se divide en ",
          { term: "Poder Ejecutivo" },
          ", ",
          { term: "Poder Legislativo" },
          " y ",
          { term: "Poder Judicial" },
          ", que se controlan entre sí (frenos y contrapesos) para que ninguno abuse.",
        ],
        info: "Edificio de la Asamblea Legislativa de Costa Rica, sede del Poder Legislativo, en San José.",
      },
      {
        image: CIV_MUNICIPALIDAD,
        title: "Rendición de cuentas y gobiernos locales",
        body: [
          "Los mecanismos de ",
          { term: "rendición de cuentas" },
          " y de incidencia permiten vigilar y participar. Los ",
          { term: "gobiernos locales" },
          " acercan las decisiones a la comunidad.",
        ],
        info: "Edificio de la Municipalidad de Montes de Oca, con el escudo del cantón sobre el portal de entrada y la bandera nacional izada.",
      },
      {
        image: CIV_TSE,
        title: "La institucionalidad democrática",
        body: [
          "La ",
          { term: "institucionalidad democrática" },
          " de Costa Rica es su mayor patrimonio, y es más frágil de lo que parece: no se pierde de un golpe, sino cuando se va normalizando que las reglas se salten «solo esta vez».",
        ],
        info: "El Tribunal Supremo de Elecciones (TSE) en San José, la institución que organiza y supervisa las elecciones en Costa Rica.",
      },
    ],
  },
  {
    slug: "abolicion-ejercito",
    label: "La abolición del ejército",
    thumbnail: CIV_MUSEO,
    glossary: {
      "abolición del ejército":
        "Decisión de Costa Rica, el 1 de diciembre de 1948, de eliminar sus fuerzas armadas permanentes.",
      "cultura pacifista":
        "Forma de convivencia que rechaza la guerra y resuelve los conflictos por medios pacíficos.",
      "institucionalidad militar":
        "Conjunto de instituciones armadas de un país; Costa Rica no la tiene desde 1948.",
    },
    slides: [
      {
        image: CIV_MUSEO,
        title: "La abolición del ejército",
        info: "Museo Nacional de Costa Rica, antiguo Cuartel Bellavista donde en 1948 se abolió el ejército.",
      },
      {
        image: CIV_FIGUERES,
        title: "1 de diciembre de 1948",
        body: [
          "Tras la guerra civil, José Figueres decretó la ",
          { term: "abolición del ejército" },
          " y entregó el Cuartel Bellavista para convertirlo en museo.",
        ],
        info: "Estatua de bronce de José Figueres Ferrer en la Plaza de la Democracia, en San José.",
      },
      {
        image: CIV_ARMAS,
        title: "Una cultura pacifista",
        body: [
          "Sin ejército, el país construyó una ",
          { term: "cultura pacifista" },
          " y democrática: los recursos que iban a lo militar se destinaron a educación y salud.",
        ],
        info: "Monumento «La destrucción de las armas», en el Parque de la Paz de San José.",
      },
      {
        image: CIV_MONUMENTO,
        title: "Trascendencia",
        body: [
          "La ausencia de ",
          { term: "institucionalidad militar" },
          " fortaleció la estabilidad democrática y proyectó a Costa Rica como un país de paz.",
        ],
        info: "El Monumento Nacional de Costa Rica, en el Parque Nacional de San José, rodeado de árboles y senderos.",
      },
    ],
  },
  {
    slug: "desafios-estado",
    label: "Desafíos de la organización estatal",
    thumbnail: CIV_CASA_AMARILLA,
    glossary: {
      eficacia: "Capacidad de lograr los objetivos propuestos.",
      eficiencia: "Lograr los objetivos usando la menor cantidad de recursos posible.",
      transparencia:
        "Que la información pública sea abierta y accesible para que la ciudadanía pueda vigilar al Estado.",
      "participación ciudadana":
        "Intervención de las personas en los asuntos públicos y en la toma de decisiones.",
      legitimidad:
        "Reconocimiento y aceptación de la autoridad porque se ejerce de forma justa y conforme a la ley.",
      corrupción:
        "Uso indebido del poder o de los recursos públicos para obtener un beneficio privado.",
      gobernabilidad:
        "Capacidad de un gobierno para tomar decisiones y aplicarlas con estabilidad y apoyo social.",
    },
    slides: [
      {
        image: CIV_CASA_AMARILLA,
        title: "Desafíos del Estado",
        info: "La Casa Amarilla, sede del Ministerio de Relaciones Exteriores en San José, de fachada neocolonial amarilla y con la bandera nacional al frente.",
      },
      {
        image: CIV_HOSPITAL,
        title: "Eficacia y eficiencia",
        body: [
          "Un buen Estado busca ",
          { term: "eficacia" },
          " (lograr sus metas) y ",
          { term: "eficiencia" },
          " (con los menores recursos), en políticas públicas inclusivas y solidarias.",
        ],
        info: "Fachada del Hospital Dr. Rafael Ángel Calderón Guardia, en San José, con personas en la plazoleta de acceso.",
      },
      {
        image: CIV_MARCHA,
        title: "Transparencia y participación",
        body: [
          "La ",
          { term: "transparencia" },
          ", la rendición de cuentas y la ",
          { term: "participación ciudadana" },
          " dan ",
          { term: "legitimidad" },
          " al Estado y combaten la ",
          { term: "corrupción" },
          ".",
        ],
        info: "Personas se manifiestan en una calle de Costa Rica; una de las mantas dice «La expresión, un derecho ciudadano».",
      },
      {
        image: CIV_BANCO,
        title: "Gobernabilidad",
        body: [
          "Los grandes desafíos son la ",
          { term: "gobernabilidad" },
          " y la transparencia: gobernar con acuerdos, reglas claras y confianza ciudadana.",
        ],
        info: "Sede del Banco Central de Costa Rica en San José: edificio de fachada de vidrio oscuro, con su rótulo sobre la entrada y la bandera nacional al frente.",
      },
    ],
  },
  {
    slug: "cultura-politica",
    label: "La cultura política costarricense",
    thumbnail: CIV_TEATRO,
    glossary: {
      "valores democráticos":
        "Principios que sostienen la democracia: libertad, igualdad, solidaridad, tolerancia, respeto, paz y honestidad.",
      "igualdad política":
        "Que todas las personas tengan los mismos derechos y el mismo peso en las decisiones públicas (un voto por persona).",
      "cultura política":
        "Conjunto de creencias, valores y costumbres con que un pueblo se relaciona con el poder y con la vida pública.",
      civismo:
        "Comportamiento de quien respeta las leyes, cuida lo público y participa en la vida de su comunidad.",
      tolerancia:
        "Respeto por las ideas, creencias y prácticas distintas a las propias.",
    },
    slides: [
      {
        image: CIV_TEATRO,
        title: "La cultura política",
        body: [
          "La ",
          { term: "cultura política" },
          " es la forma en que un pueblo se relaciona con el poder: lo que cree, lo que espera del Estado y cómo participa.",
        ],
        info: "Fachada del Teatro Nacional de Costa Rica iluminada de noche, con las estatuas sobre el frontón y los faroles del frente.",
      },
      {
        image: CIV_SANTAMARIA,
        title: "Valores democráticos",
        body: [
          "Los ",
          { term: "valores democráticos" },
          " no se heredan: se aprenden y se practican. La ",
          { term: "igualdad política" },
          " es el más exigente de todos, porque obliga a aceptar que el voto del vecino pesa exactamente lo mismo que el propio.",
        ],
        info: "Estatua de bronce de Juan Santamaría en Alajuela, que lo representa avanzando con una antorcha en alto y un fusil en la otra mano.",
      },
      {
        image: CIV_MORAZAN,
        title: "Actitudes cívicas",
        body: [
          "Respetar la libertad propia y ajena, cumplir la ley y cuidar lo público: el ",
          { term: "civismo" },
          " son las actitudes cotidianas que sostienen la democracia.",
        ],
        info: "Personas reunidas alrededor del Templo de la Música, en el Parque Morazán de San José.",
      },
      {
        image: CIV_INDIGENA,
        title: "Tolerancia vs intolerancia",
        body: [
          "El gran desafío es fortalecer la ",
          { term: "tolerancia" },
          " frente a la intolerancia, para convivir en la diversidad.",
        ],
        info: "Celebración del Día del Indígena en Rancho Grande, Talamanca, con participantes vestidos de indígenas y de conquistadores españoles.",
      },
    ],
  },
];

// --- Sociales II -----------------------------------------------------------
// Una sección por documento del profesor Rudy Alexander Pérez Moya:
//   · Descolonización de Asia y África (presentación)
//   · Descolonización Política — Jigsaw + Matriz + guía de preguntas
//     (los cuatro casos van SEPARADOS, como los trabaja él)
//   · Guía de preguntas — Operación Cóndor
//   · Modelos Económicos en la Guerra Fría (presentación)
//   · Fin del socialismo Real (presentación)
// Dictaduras, Centroamérica y derechos civiles no tienen presentación: salen
// del temario.
const SII_DESC_1 = "/kit/histok/images/sii-desc-1.jpg";
const SII_DESC_2 = "/kit/histok/images/sii-desc-2.jpg";
const SII_DESC_ASIA = "/kit/histok/images/sii-desc-asia.jpg";
const SII_DESC_AFRICA = "/kit/histok/images/sii-desc-africa.jpg";
const SII_DESC_SUBSAHARA = "/kit/histok/images/sii-desc-subsahara.jpg";
const SII_DESC_5 = "/kit/histok/images/sii-desc-5.jpg";
const SII_CASOS = "/kit/histok/images/sii-casos.jpg";
const SII_DESC_4 = "/kit/histok/images/sii-desc-4.jpg";
const SII_DESC_SIRIA = "/kit/histok/images/sii-desc-siria.jpg";
const SII_DESC_3 = "/kit/histok/images/sii-desc-3.jpg";
const SII_PER_GADAFI = "/kit/histok/images/sii-per-gadafi.jpg";
const SII_PER_IDRIS = "/kit/histok/images/sii-per-idris.jpg";
const SII_PER_BOURGUIBA = "/kit/histok/images/sii-per-bourguiba.jpg";
const SII_PER_QUWATLI = "/kit/histok/images/sii-per-quwatli.jpg";
const SII_PER_GANDHI = "/kit/histok/images/sii-per-gandhi.jpg";
const SII_DICT_1 = "/kit/histok/images/sii-dict-1.jpg";
const SII_DICT_GF = "/kit/histok/images/sii-dict-gf.jpg";
const SII_DICTADORES = "/kit/histok/images/sii-dictadores.svg";
const SII_DICT_2 = "/kit/histok/images/sii-dict-2.jpg";
const SII_DICT_3 = "/kit/histok/images/sii-dict-3.jpg";
const SII_DICT_4 = "/kit/histok/images/sii-dict-4.jpg";
const SII_DICT_CONDOR = "/kit/histok/images/sii-dict-condor.jpg";
const SII_CONDOR_COMO = "/kit/histok/images/sii-condor-como.jpg";
const SII_CONDOR_MEMORIA = "/kit/histok/images/sii-condor-memoria.jpg";
const SII_DICT_5 = "/kit/histok/images/sii-dict-5.jpg";
const SII_CA_GUERRAS = "/kit/histok/images/sii-ca-guerras.jpg";
const SII_CA_ESQUIPULAS = "/kit/histok/images/sii-ca-esquipulas.jpg";
const SII_CIV_1 = "/kit/histok/images/sii-civ-1.jpg";
const SII_CIV_2 = "/kit/histok/images/sii-civ-2.jpg";
const SII_CIV_3 = "/kit/histok/images/sii-civ-3.jpg";
const SII_CIV_4 = "/kit/histok/images/sii-civ-4.jpg";
const SII_ECO_1 = "/kit/histok/images/sii-eco-1.jpg";
const SII_ECO_2 = "/kit/histok/images/sii-eco-2.jpg";
const SII_ECO_KEYNES = "/kit/histok/images/sii-eco-keynes.jpg";
const SII_ECO_BIENESTAR = "/kit/histok/images/sii-eco-bienestar.jpg";
const SII_ECO_3 = "/kit/histok/images/sii-eco-3.jpg";
const SII_ECO_PLANES = "/kit/histok/images/sii-eco-planes.jpg";
const SII_ECO_4 = "/kit/histok/images/sii-eco-4.jpg";
const SII_FIN_GORBACHOV = "/kit/histok/images/sii-fin-gorbachov.jpg";
const SII_FIN_REFORMAS = "/kit/histok/images/sii-fin-reformas.jpg";
const SII_FIN_URSS = "/kit/histok/images/sii-fin-urss.jpg";
const SII_FIN_YUGO = "/kit/histok/images/sii-fin-yugoslavia.jpg";
const SII_FIN_BLOQUE = "/kit/histok/images/sii-fin-bloque.jpg";

const socialesII: Topic[] = [
  {
    slug: "descolonizacion",
    label: "Descolonización de Asia y África",
    thumbnail: SII_DESC_1,
    glossary: {
      descolonización:
        "Proceso por el que las colonias de Asia y África se independizaron de las potencias europeas, sobre todo entre 1945 y 1975.",
      "autodeterminación de los pueblos":
        "Derecho de cada pueblo a decidir su forma de gobierno y su destino, reconocido en la Carta de San Francisco que creó la ONU en 1945.",
      "Carta del Atlántico":
        "Declaración de 1941 entre Estados Unidos y el Reino Unido que reconoció el derecho de los pueblos a elegir su gobierno.",
      panafricanismo:
        "Movimiento que defendía la unidad de todos los pueblos africanos frente al colonialismo.",
      "Organización de la Unidad Africana":
        "Organismo creado en 1963 por los países africanos independientes para defender su soberanía y apoyar a los que aún luchaban.",
      "Primavera Árabe":
        "Ola de protestas populares que desde 2010 recorrió Túnez, Egipto, Libia, Siria y Yemen exigiendo democracia.",
    },
    slides: [
      {
        image: SII_DESC_1,
        title: "Descolonización de Asia y África",
        info: "Sukarno, acompañado de Mohammad Hatta, proclama la independencia de Indonesia la mañana del 17 de agosto de 1945 en Yakarta. Foto de Frans Mendur, dominio público.",
      },
      {
        image: SII_DESC_2,
        title: "Las siete causas",
        info: "Delegados en la sesión inaugural de la Conferencia de Bandung, Indonesia, 1955: la primera vez que los países recién independizados de Asia y África se sentaron juntos. Foto del Ministerio de Exteriores de Indonesia, dominio público.",
        body: [
          "Colonias empobrecidas que, sin embargo, fueron protagonistas en la Segunda Guerra Mundial. Europa perdió su hegemonía militar y económica. Crecieron los nacionalismos. La ",
          { term: "Carta del Atlántico" },
          " y la ",
          { term: "autodeterminación de los pueblos" },
          " dieron el argumento legal. Y en plena Guerra Fría, EE. UU. y la URSS empujaron desde afuera.",
        ],
      },
      {
        image: SII_DESC_ASIA,
        title: "Asia: dos caminos",
        info: "Tropas del Viet Minh plantan su bandera sobre el puesto de mando francés capturado en Dien Bien Phu, 1954: la derrota que sacó a Francia de Indochina. Foto del Ejército Popular de Vietnam, dominio público.",
        body: [
          "La ",
          { term: "descolonización" },
          " asiática fue rápida: 1945 la Liga Árabe, 1946 Siria, 1947 India y Pakistán, 1948 Israel, 1955 Indonesia, 1957 Malasia, 1971 Bangladesh. Pero no todos llegaron igual: mientras Gandhi negociaba sin armas, Ho Chi Minh expulsó a Francia de Vietnam por la vía militar.",
        ],
      },
      {
        image: SII_DESC_AFRICA,
        title: "África: más tarde y más difícil",
        info: "Kwame Nkrumah (Ghana) y Gamal Abdel Nasser (Egipto) reunidos en El Cairo en febrero de 1966, dos de las caras del panafricanismo. Foto de Anefo, CC0.",
        body: [
          "Llegó después que en Asia, por estructuras sociales antiguas e instituciones muy débiles. El ",
          { term: "panafricanismo" },
          " le dio impulso y en 1963 nació la ",
          { term: "Organización de la Unidad Africana" },
          ". El proceso empezó por el norte y de ahí bajó.",
        ],
      },
      {
        image: SII_DESC_SUBSAHARA,
        title: "La África subsahariana",
        info: "El primer ministro congoleño Patrice Lumumba firma el documento que concede la independencia al Congo, junto al primer ministro belga Gaston Eyskens, el 30 de junio de 1960. Fotografía de Congopresse, dominio público.",
        body: [
          "Fue la peor preparada, porque a las potencias les interesaba menos. No se habían formado naciones: la organización seguía siendo tribal y rudimentaria. Al irse los europeos quedaron fronteras artificiales, y con ellas violencia y discursos de odio entre etnias.",
        ],
      },
      {
        image: SII_DESC_5,
        title: "Lo que quedó",
        info: "La plaza Tahrir de El Cairo llena de manifestantes el 29 de julio de 2011, durante la Primavera Árabe. Foto de Ahmed Abd El-Fatah, CC BY 2.0.",
        body: [
          "Economías atadas al exterior que terminaron cayendo, inestabilidad política y un crecimiento de población sin crecimiento económico, que empeoró el nivel de vida. Medio siglo después, la ",
          { term: "Primavera Árabe" },
          " mostró que esas cuentas seguían sin saldarse.",
        ],
      },
    ],
  },
  {
    slug: "casos-descolonizacion",
    label: "Los cuatro casos",
    thumbnail: SII_CASOS,
    glossary: {
      "potencia colonial":
        "El país europeo que gobernaba la colonia y se beneficiaba de sus recursos.",
      protectorado:
        "Territorio que conserva su gobierno propio pero queda bajo el control político y militar de una potencia extranjera.",
      mandato:
        "Territorio que la Sociedad de Naciones entregó a una potencia para administrarlo tras la caída de los imperios otomano y alemán.",
      "no violencia":
        "Método de lucha que rechaza las armas y usa marchas, boicots y desobediencia civil.",
      partición:
        "División de un territorio en dos o más Estados nuevos.",
      "No Alineados":
        "Bloque de países que en la Guerra Fría se negaron a tomar partido por Estados Unidos o por la URSS.",
    },
    slides: [
      {
        image: SII_CASOS,
        title: "Los cuatro casos",
        info: "Mapa de las Naciones Unidas de 1960 con los territorios que aún dependían de una potencia extranjera: más de 60 millones de personas. Documento de la ONU, dominio público.",
      },
      {
        image: SII_DESC_4,
        title: "Túnez",
        info: "Firma del protocolo de independencia de Túnez en París, 20 de marzo de 1956. Ahmed Mestiri, miembro de la delegación tunecina, aparece en la mesa. Fotografía de dominio público (Wikimedia Commons).",
        body: [
          "Su ",
          { term: "potencia colonial" },
          " fue Francia, que lo gobernaba como ",
          { term: "protectorado" },
          " desde 1881. La independencia se negoció en una mesa, no en una guerra: primero la autonomía en 1955, y el protocolo firmado en París el 20 de marzo de 1956. Después el país se alineó con Occidente. Hoy: aquí empezó la Primavera Árabe.",
        ],
      },
      {
        image: SII_PER_BOURGUIBA,
        title: "Túnez: los personajes",
        info: "Habib Bourguiba, líder independentista y primer presidente de Túnez, en un retrato oficial de 1960. Foto de Habib Osman, dominio público.",
        body: [
          { name: "Habib Bourguiba" },
          " dirigía el Neo-Destur, el partido que pedía la independencia. Pasó años preso y exiliado antes de sentarse a negociar, y luego gobernó Túnez treinta años. Quien firmó en París fue el primer ministro ",
          { name: "Taher Ben Ammar" },
          ".",
        ],
      },
      {
        image: SII_PER_IDRIS,
        title: "Libia",
        info: "Sayyid Mohammed Idris as-Senussi, emir de Cirenaica y primer rey de Libia, fotografiado el 24 de julio de 1951, meses antes de la independencia. Foto de Anefo / Nationaal Archief, CC0.",
        body: [
          "Su ",
          { term: "potencia colonial" },
          " fue Italia desde 1911; al perder la guerra quedó bajo administración británica y francesa. Su independencia no la negoció nadie: la decidió la ",
          { name: "ONU" },
          ", y el 24 de diciembre de 1951 Libia fue el primer país del mundo en nacer así, como reino de ",
          { name: "Idris I" },
          ". Hoy: dividida y en conflicto desde 2011.",
        ],
      },
      {
        image: SII_PER_GADAFI,
        title: "Libia: los personajes",
        info: "Muamar Gadafi en Belgrado el 25 de febrero de 1970, pocos meses después del golpe que lo llevó al poder. Foto de Stevan Kragujević, CC BY-SA 3.0.",
        body: [
          { name: "Idris I" },
          " era emir de Cirenaica y jefe de la orden religiosa senusí; reinó sobre un país nuevo y pobre, y permitió bases militares de EE. UU. y el Reino Unido. En 1969 lo derrocó un coronel de 27 años, ",
          { name: "Muamar Gadafi" },
          ", que cerró esas bases, acercó Libia a la URSS y gobernó 42 años.",
        ],
      },
      {
        image: SII_DESC_SIRIA,
        title: "Siria",
        info: "Izado de la bandera siria en 1946, tras la salida de las tropas francesas. Fotografía de dominio público (Wikimedia Commons).",
        body: [
          "Su ",
          { term: "potencia colonial" },
          " fue Francia, pero no como colonia: al caer el Imperio Otomano, Siria quedó como ",
          { term: "mandato" },
          ". Las revueltas y el bombardeo francés de Damasco forzaron la salida, y el 17 de abril de 1946 se fue el último soldado. Siria celebra esa fecha como el Día de la Evacuación. En la Guerra Fría se alineó con la URSS. Hoy: en guerra civil desde 2011.",
        ],
      },
      {
        image: SII_PER_QUWATLI,
        title: "Siria: los personajes",
        info: "Shukri al-Quwatli, presidente de Siria en la independencia de 1946, dando un discurso en Homs en 1947. Fotografía de autor desconocido, dominio público.",
        body: [
          { name: "Shukri al-Quwatli" },
          " era el presidente el día de la evacuación, después de militar desde joven contra el dominio extranjero. Volvió al poder en 1955, y en 1958 entregó la presidencia para unir Siria con el Egipto de ",
          { name: "Nasser" },
          " en la República Árabe Unida.",
        ],
      },
      {
        image: SII_DESC_3,
        title: "India – Pakistán",
        info: "Lord Mountbatten, último virrey británico de la India, con Muhammad Ali Jinnah, fundador de Pakistán, durante las negociaciones de 1947. Fotografía de dominio público (Wikimedia Commons).",
        body: [
          "Su ",
          { term: "potencia colonial" },
          " fue el Reino Unido. Décadas de ",
          { term: "no violencia" },
          " desgastaron al imperio y la salida se ejecutó en 1947, pero con ",
          { term: "partición" },
          ": millones de desplazados y matanzas entre comunidades. Luego India lideró a los ",
          { term: "No Alineados" },
          " y Pakistán se alió con EE. UU. Hoy: enfrentados por Cachemira, ambos con armas nucleares.",
        ],
      },
      {
        image: SII_PER_GANDHI,
        title: "India: los personajes",
        info: "Mohandas K. Gandhi en su residencia de Delhi el 2 de octubre de 1946, el día que cumplía 77 años. Foto de Fox Photos, dominio público.",
        body: [
          { name: "Gandhi" },
          " pasó casi treinta años al frente de la resistencia india sin tomar un arma, y por eso lo llamaron Mahatma, «alma grande». ",
          { name: "Nehru" },
          " sería el primer primer ministro de India y ",
          { name: "Jinnah" },
          " el fundador de Pakistán; el virrey ",
          { name: "Mountbatten" },
          " fue el británico encargado de entregar el poder y de trazar la división.",
        ],
      }
    ],
  },
  {
    slug: "dictaduras-latinoamerica",
    label: "Dictaduras en Latinoamérica",
    thumbnail: SII_DICT_1,
    glossary: {
      "Estado de excepción":
        "Situación en la que un gobierno suspende garantías y derechos alegando una emergencia, y concentra el mando.",
      dictadura:
        "Régimen en el que una persona o un grupo concentra todo el poder, sin elecciones libres ni división de poderes.",
      "golpe de Estado":
        "Toma del poder por la fuerza, generalmente militar, derrocando al gobierno legítimo.",
      "doctrina de seguridad nacional":
        "Idea impulsada durante la Guerra Fría según la cual el enemigo estaba dentro del propio país.",
      "Pacto de Punto Fijo":
        "Acuerdo de 1958 entre los grandes partidos venezolanos para turnarse el poder y sostener la democracia.",
    },
    slides: [
      {
        image: SII_DICT_1,
        title: "Dictaduras en Latinoamérica",
        info: "Concentración masiva por la opción «No» durante la campaña del plebiscito chileno de 1988, el voto que puso fecha de salida a Pinochet. Foto de la Biblioteca del Congreso Nacional de Chile, CC BY 3.0 cl.",
      },
      {
        image: SII_DICT_GF,
        title: "La Guerra Fría llega a la región",
        info: "John F. Kennedy habla en el primer aniversario de la Alianza para el Progreso ante los diplomáticos latinoamericanos, 13 de marzo de 1962. Foto de Robert Knudsen, Casa Blanca, dominio público.",
        body: [
          "Estados Unidos y la URSS convirtieron América Latina en un tablero de su conflicto. Washington entrenó a los ejércitos de la región en la ",
          { term: "doctrina de seguridad nacional" },
          ", y con ese argumento los militares tomaron el poder en casi todo el continente.",
        ],
      },
      {
        image: SII_DICTADORES,
        title: "Los dictadores",
        diagram: true,
        info: "Los siete dictadores del temario, con su país y sus años en el poder, más tres nombres de Centroamérica.",
        body: [
          "Casi todos llegaron por un golpe militar y gobernaron con el ",
          { term: "Estado de excepción" },
          ": sin elecciones, sin prensa libre y con la oposición perseguida. Las excepciones marcan la diferencia — Somoza heredó el poder de su familia, Castro llegó por una revolución y Chávez por las urnas.",
        ],
      },
      {
        image: SII_DICT_2,
        title: "El Cono Sur",
        info: "Augusto Pinochet con la Junta Militar de Gobierno de Chile, 1985. Foto del Ministerio de Relaciones Exteriores de Chile, CC BY 2.0 cl.",
        body: [
          "Un ",
          { term: "golpe de Estado" },
          " tras otro instaló una ",
          { term: "dictadura" },
          " militar: Videla en Argentina (1976-1983), Pinochet en Chile (1973-1990), Stroessner en Paraguay (1954-1989, la más larga de Sudamérica) y Banzer en Bolivia (1971-1978).",
        ],
      },
      {
        image: SII_DICT_3,
        title: "Cuba",
        info: "Fidel Castro con el secretario de Estado estadounidense Christian Herter en Nueva York, 16 de abril de 1959, pocos meses después de la Revolución y antes de la ruptura con Estados Unidos. Foto de Warren K. Leffler, dominio público.",
        body: [
          "La Revolución de 1959 derrocó a Batista y llevó al poder a Fidel Castro, que gobernó casi cinco décadas. La isla adoptó un sistema de partido único aliado con la URSS: avances en salud y educación, pero sin elecciones libres ni prensa libre.",
        ],
      },
      {
        image: SII_DICT_4,
        title: "Venezuela",
        info: "Rafael Caldera llega al palacio de Miraflores el 11 de marzo de 1969: un traspaso de mando entre civiles electos, en pleno Pacto de Punto Fijo. Fotografía de dominio público (Wikimedia Commons).",
        body: [
          "Aquí el desenlace fue distinto: en 1958 cayó la dictadura de Pérez Jiménez y el ",
          { term: "Pacto de Punto Fijo" },
          " sostuvo cuatro décadas de democracia, financiada por el petróleo. La crisis económica y la corrupción desgastaron ese modelo a finales del siglo XX.",
        ],
      },
    ],
  },
  {
    slug: "operacion-condor",
    label: "Operación Cóndor",
    thumbnail: SII_DICT_CONDOR,
    glossary: {
      "Plan Cóndor":
        "Coordinación secreta entre las dictaduras de Argentina, Chile, Uruguay, Paraguay, Bolivia y Brasil para perseguir opositores más allá de sus fronteras.",
      desaparecidos:
        "Personas detenidas por las dictaduras cuyo paradero nunca se reconoció.",
      "terrorismo de Estado":
        "Uso del aparato del Estado —policía, ejército, servicios de inteligencia— para sembrar miedo mediante secuestros, tortura y asesinatos.",
      "memoria histórica":
        "Esfuerzo de una sociedad por recordar lo ocurrido y reconocer a las víctimas, para que no vuelva a pasar.",
    },
    slides: [
      {
        image: SII_DICT_CONDOR,
        title: "Operación Cóndor",
        info: "Nombres grabados en el Parque de la Memoria de Buenos Aires, monumento a las víctimas del terrorismo de Estado argentino. Foto de ProtoplasmaKid, CC BY-SA 4.0.",
      },
      {
        image: SII_CONDOR_COMO,
        title: "Cómo funcionó",
        info: "Sótano de la Escuela de Mecánica de la Armada (ESMA) en Buenos Aires, centro clandestino de detención y tortura durante la dictadura argentina. Foto de Adam Jones, CC BY-SA 2.0.",
        body: [
          "Desde 1975 las dictaduras del Cono Sur se pasaban información, se prestaban centros de detención y se entregaban presos entre ellas, con apoyo y entrenamiento de Estados Unidos. Con el ",
          { term: "Plan Cóndor" },
          ", cruzar la frontera dejó de ser una salida: nadie estaba a salvo del otro lado.",
        ],
      },
      {
        image: SII_CONDOR_MEMORIA,
        title: "Memoria y derechos humanos",
        info: "Muro con rostros de víctimas de la dictadura chilena (1973-1990) en el Museo de la Memoria y los Derechos Humanos de Santiago. Foto de Carlos Teixidor Cadenas, CC BY-SA 4.0.",
        body: [
          "Dejó miles de ",
          { term: "desaparecidos" },
          ", torturados y exiliados: fue ",
          { term: "terrorismo de Estado" },
          ", no excesos aislados. Los gobiernos lo justificaban como una guerra contra la subversión. Décadas después, juicios y museos sostienen la ",
          { term: "memoria histórica" },
          ", y esa es la discusión de fondo: hasta dónde puede la seguridad nacional justificar perseguir a alguien por lo que piensa.",
        ],
      },
    ],
  },
  {
    slug: "centroamerica",
    label: "Centroamérica en los 80",
    thumbnail: SII_DICT_5,
    glossary: {
      democratización:
        "Proceso de volver a un sistema con elecciones libres, partidos y derechos garantizados.",
      Esquipulas:
        "Acuerdos de paz firmados en 1987 por los presidentes centroamericanos, impulsados por Óscar Arias.",
      Contra: "Grupos armados que, financiados por Estados Unidos, combatieron al gobierno sandinista de Nicaragua.",
      "guerra civil":
        "Conflicto armado entre grupos de un mismo país por el control del poder.",
    },
    slides: [
      {
        image: SII_DICT_5,
        title: "Centroamérica en los 80",
        info: "Acto del Primero de Mayo en Chinandega, Nicaragua, 1984, durante el gobierno sandinista. Foto de SLR Images, CC BY 2.0.",
      },
      {
        image: SII_CA_GUERRAS,
        title: "Cuatro países, cuatro desenlaces",
        info: "Tropas salvadoreñas descienden de un helicóptero estadounidense durante el ejercicio Granadero I, mayo de 1984: la ayuda militar de EE. UU. en plena guerra civil. Foto del Departamento de Defensa de EE. UU., dominio público.",
        body: [
          "En Nicaragua la revolución sandinista derrocó a Somoza en 1979 y enfrentó después a la ",
          { term: "Contra" },
          ". El Salvador y Guatemala vivieron cada uno una ",
          { term: "guerra civil" },
          " larguísima —la guatemalteca duró 36 años e incluyó genocidio contra comunidades indígenas—. Honduras no tuvo guerra propia, pero fue la base desde donde operaban.",
        ],
      },
      {
        image: SII_CA_ESQUIPULAS,
        title: "La paz que se negoció",
        info: "El costarricense Óscar Arias Sánchez, impulsor del plan de paz de Esquipulas y Premio Nobel de la Paz 1987. Foto de John Mathew Smith, CC BY-SA 2.0.",
        body: [
          "La ",
          { term: "democratización" },
          " no llegó por una victoria militar sino por una negociación: ",
          { term: "Esquipulas" },
          ". Fue Centroamérica resolviendo lo suyo sin las potencias, y le valió a Óscar Arias el Premio Nobel de la Paz.",
        ],
      },
    ],
  },
  {
    slug: "derechos-civiles",
    label: "Derechos civiles en Estados Unidos",
    thumbnail: SII_CIV_1,
    glossary: {
      "segregación racial":
        "Separación por ley de blancos y negros en escuelas, buses, restaurantes y baños, vigente en el sur de Estados Unidos hasta los años 60.",
      "desobediencia civil":
        "Desobedecer de forma pacífica y pública una ley injusta, aceptando las consecuencias, para forzar su cambio.",
      contracultura:
        "Movimiento juvenil que rechaza los valores dominantes de la sociedad y propone otra forma de vivir.",
      "derechos civiles":
        "Derechos que garantizan a toda persona igualdad ante la ley y participación en la vida pública, sin importar su raza.",
    },
    slides: [
      {
        image: SII_CIV_1,
        title: "Derechos civiles en Estados Unidos",
        info: "Manifestantes descansan durante la marcha de Selma a Montgomery, Alabama, en 1965; una pancarta dice que marchan juntos católicos, judíos y protestantes. Foto de Peter Pettus, dominio público.",
      },
      {
        image: SII_CIV_2,
        title: "Martin Luther King",
        info: "Martin Luther King Jr. en 1964, el año en que recibió el Premio Nobel de la Paz. Foto de Marion S. Trikosko, dominio público.",
        body: [
          "King encabezó la lucha por los ",
          { term: "derechos civiles" },
          " contra la ",
          { term: "segregación racial" },
          ", con marchas, boicots y ",
          { term: "desobediencia civil" },
          ". En la Marcha sobre Washington de 1963 pronunció su discurso «I have a dream». Recibió el Nobel de la Paz en 1964 y fue asesinado en 1968.",
        ],
      },
      {
        image: SII_CIV_3,
        title: "Malcolm X",
        info: "Malcolm X fotografiado el 12 de marzo de 1964, el día que anunció su ruptura con la Nación del Islam. Foto de Ed Ford, New York World-Telegram, dominio público.",
        body: [
          "Malcolm X defendió una postura más combativa: orgullo negro, autodefensa y desconfianza hacia la integración. Su voz dio fuerza a quienes sentían que la vía pacífica avanzaba demasiado lento. Fue asesinado en 1965.",
        ],
      },
      {
        image: SII_CIV_4,
        title: "El movimiento hippie",
        info: "Una manifestante le ofrece una flor a la policía militar que custodia el Pentágono durante una protesta contra la guerra de Vietnam, 21 de octubre de 1967. Foto del Departamento de Defensa de EE. UU., dominio público.",
        body: [
          "En los años 60 los jóvenes estadounidenses levantaron una ",
          { term: "contracultura" },
          ": marcharon contra la guerra de Vietnam, se fueron a vivir en comunas y convirtieron la música en su forma de protesta.",
        ],
      },
    ],
  },
  {
    slug: "modelos-economicos",
    label: "Modelos económicos en la Guerra Fría",
    thumbnail: SII_ECO_1,
    glossary: {
      capitalismo:
        "Sistema basado en la propiedad privada, la libre competencia y la búsqueda de ganancia; los precios los fija el mercado.",
      socialismo:
        "Sistema en el que el Estado es dueño de los medios de producción y dirige la economía buscando la igualdad social.",
      "Estado de Bienestar":
        "Forma de gobierno en la que el Estado participa activamente en la economía y crea políticas públicas que garantizan seguridad social a toda la población.",
      "impuestos directos":
        "Los que se cobran sobre la renta y la riqueza de cada quien: pagan más los que más tienen.",
      "economía planificada":
        "Modelo en el que el Estado decide qué, cuánto y cómo se produce, en lugar de dejarlo al mercado.",
      "colectivización agraria":
        "Entregar las propiedades agrícolas y ganaderas a la colectividad.",
      "planes quinquenales":
        "Programas soviéticos de cinco años en los que el Estado fijaba metas de producción y repartía los recursos.",
      "Doctrina Brezhnev":
        "Doctrina creada en 1968 según la cual ningún país firmante del Pacto de Varsovia podía abandonarlo.",
    },
    slides: [
      {
        image: SII_ECO_1,
        title: "Modelos económicos en la Guerra Fría",
        info: "Tanques estadounidenses y soviéticos frente a frente en el Checkpoint Charlie de Berlín, octubre de 1961: los dos modelos separados por unos metros de calle. Foto del Ejército de EE. UU., dominio público.",
      },
      {
        image: SII_ECO_2,
        title: "El modelo capitalista",
        info: "Corredores de bolsa trabajando en el piso de la Bolsa de Nueva York, 1963. Foto de Thomas J. O'Halloran, dominio público.",
        body: [
          "Tras la guerra, el ",
          { term: "capitalismo" },
          " cambió de cara: el Estado empezó a gastar e intervenir. Se crearon empresas públicas de electricidad, hidrocarburos y transportes, y con los ",
          { term: "impuestos directos" },
          " se redistribuyó la riqueza.",
        ],
      },
      {
        image: SII_ECO_KEYNES,
        title: "Keynes, el gestor",
        info: "John Maynard Keynes (derecha) junto a Harry Dexter White en la reunión inaugural del Fondo Monetario Internacional, Savannah, marzo de 1946. Foto del FMI, dominio público.",
        body: [
          "El modelo lo diseñó John Maynard Keynes. Lo aplicaron primero gobiernos conservadores de Francia, Alemania e Italia en los años 50, y en los 70 los socialdemócratas de Estados Unidos, Alemania, Suecia y el Reino Unido. Evitó caídas abruptas y trajo bonanza incluso a países subdesarrollados.",
        ],
      },
      {
        image: SII_ECO_BIENESTAR,
        title: "¿Qué cambió en la vida diaria?",
        info: "El ministro de Salud británico Aneurin Bevan en el primer día del Servicio Nacional de Salud, 5 de julio de 1948: atención médica gratuita para todos, el símbolo del Estado de bienestar. Fotografía de dominio público.",
        body: [
          "De ahí nació el ",
          { term: "Estado de Bienestar" },
          ". Una familia obrera europea pasó a tener médico, pensión y una escuela decente para sus hijos. Creció la fuerza de trabajo, se emparejaron los salarios y empresarios y sindicatos empezaron a negociar en vez de chocar.",
        ],
      },
      {
        image: SII_ECO_3,
        title: "El modelo socialista",
        info: "Estudiantes cargan papas para el almacén del koljós «Pravda», región de Yaroslavl, septiembre de 1979: la cosecha colectiva planificada desde el Estado. Foto de V. S. Spiridonov, CC BY-SA 3.0.",
        body: [
          "En el bloque soviético el ",
          { term: "socialismo" },
          " puso las fábricas en manos del Estado y cerró la puerta a la iniciativa privada. En el campo aplicó la ",
          { term: "colectivización agraria" },
          ", que buscaba alimentar a las ciudades y surtir de materias primas a la industria.",
        ],
      },
      {
        image: SII_ECO_PLANES,
        title: "Planificar todo, y sus costos",
        info: "Jóvenes del Komsomol en la construcción del sexto alto horno del combinado metalúrgico de Magnitogorsk, la obra insignia de los planes quinquenales soviéticos. Foto de Iván Shaguin, RIA Novosti, CC BY-SA 3.0.",
        body: [
          "El Estado dirigía la ",
          { term: "economía planificada" },
          " con ",
          { term: "planes quinquenales" },
          ". Pero faltó abastecimiento cuando el campo se vació hacia la ciudad, los campesinos resistieron, creció el descontento y la industria pesada se comió los bienes de consumo. Kruschev intentó corregirlo; Brezhnev endureció la línea y sostuvo el bloque con la ",
          { term: "Doctrina Brezhnev" },
          ".",
        ],
      },
    ],
  },
  {
    slug: "fin-socialismo-real",
    label: "El fin del socialismo real",
    thumbnail: SII_ECO_4,
    glossary: {
      "socialismo real":
        "Nombre que se dio a los regímenes socialistas que existieron de verdad en la URSS y Europa del Este.",
      Perestroika:
        "Política de Gorbachov para reordenar la economía y abrir el gobierno: mercado, actividad comercial y propiedad privada.",
      Glasnost:
        "Política de Gorbachov de libertad y transparencia de la información, que además separó el Estado del Partido Comunista.",
      "Pacto de Varsovia":
        "Alianza militar de la URSS y los países socialistas de Europa del Este, creada frente a la OTAN.",
      "Comunidad de Estados Independientes":
        "Asociación creada en diciembre de 1991 para mantener ligadas entre sí a las antiguas repúblicas soviéticas.",
      "Divorcio de Terciopelo":
        "Nombre que recibió la separación pacífica y negociada de Chequia y Eslovaquia.",
    },
    slides: [
      {
        image: SII_ECO_4,
        title: "El fin del socialismo real",
        info: "Alemanes del este y del oeste se encuentran en la brecha abierta en el Muro de Berlín junto a la Puerta de Brandeburgo, diciembre de 1989. Foto de F. Lee Corkran, dominio público.",
      },
      {
        image: SII_FIN_REFORMAS,
        title: "Las causas",
        info: "Ronald Reagan y Mijaíl Gorbachov firman el Tratado INF en la Casa Blanca, 8 de diciembre de 1987: el primer acuerdo que eliminó una clase entera de misiles nucleares. Foto de la Casa Blanca, dominio público.",
        body: [
          "El ",
          { term: "socialismo real" },
          " se agotó por corrupción, exceso de burocracia, descontento social y un fuerte déficit en los presupuestos públicos de la URSS. En 1985 Mijaíl Gorbachov llegó al poder decidido a reformarlo.",
        ],
      },
      {
        image: SII_FIN_GORBACHOV,
        title: "Perestroika y Glasnost",
        info: "Mijaíl Gorbachov en la conferencia de prensa posterior a la cumbre de Reikiavik, octubre de 1986. Foto de Yuri Abramochkin, RIA Novosti, CC BY-SA 3.0.",
        body: [
          "Gorbachov intentó salvar el sistema con dos reformas: la ",
          { term: "Perestroika" },
          " y la ",
          { term: "Glasnost" },
          ". Por primera vez en décadas se podía criticar al gobierno en voz alta. Y se acercó a Washington: el tratado de 1987 obligó a ambas potencias a reducir su arsenal nuclear y a dejarse inspeccionar.",
        ],
      },
      {
        image: SII_FIN_BLOQUE,
        title: "Las consecuencias",
        info: "Multitud en una manifestación en Praga durante la Revolución de Terciopelo, finales de noviembre de 1989. Foto de RobbieIanMorrison, CC BY 4.0.",
        body: [
          "En 1987 hubo elecciones con más de un candidato y se liberaron opositores; se derogó el artículo que daba el monopolio al Partido Comunista. En 1989 cayeron uno tras otro los gobiernos de Europa del Este, y en 1991 se rompió el ",
          { term: "Pacto de Varsovia" },
          ". Las reformas no salvaron a la URSS: la aceleraron.",
        ],
      },
      {
        image: SII_FIN_URSS,
        title: "Los 15 países de la URSS",
        info: "Leonid Kravchuk (Ucrania), Stanislav Shushkévich (Bielorrusia) y Borís Yeltsin (Rusia) en Belovézhskaya Puscha el 8 de diciembre de 1991, tras firmar el acuerdo que disolvió la URSS. Foto de Yuri Ivánov, RIA Novosti, CC BY-SA 3.0.",
        body: [
          "El 8 de diciembre de 1991 los líderes de Rusia, Ucrania y Bielorrusia firmaron el acta que liquidaba la URSS y creaba la ",
          { term: "Comunidad de Estados Independientes" },
          ". Nacieron 15 países: las tres bálticas (Estonia, Letonia, Lituania), las tres eslavas (Rusia, Ucrania, Bielorrusia), Moldavia, las tres del Cáucaso (Georgia, Armenia, Azerbaiyán) y las cinco de Asia Central (Kazajistán, Uzbekistán, Turkmenistán, Kirguistán, Tayikistán).",
        ],
      },
      {
        image: SII_FIN_YUGO,
        title: "Yugoslavia y Checoslovaquia",
        info: "Mapa de las Naciones Unidas de la antigua Yugoslavia, con las repúblicas que salieron de ella. Documento de la ONU, dominio público.",
        body: [
          "Yugoslavia tenía seis repúblicas y se rompió con guerra: Eslovenia y Croacia se declararon independientes en junio de 1991, Macedonia en septiembre y Bosnia y Herzegovina en 1992. Serbia y Montenegro siguieron juntas hasta 2006, y Kosovo se declaró independiente en 2008. Checoslovaquia hizo lo contrario: acordó separarse en junio de 1992 y el 1 de enero de 1993 nacieron Chequia y Eslovaquia sin un solo disparo, el ",
          { term: "Divorcio de Terciopelo" },
          ".",
        ],
      },
    ],
  },
];

// ── Biología I ────────────────────────────────────────────────────────────
// Los gráficos son SVG dibujados para la app (fondo azul oscuro, trazo neón),
// no fotos: van con `diagram: true` para que se vean enteros. Se generan a
// mano; el original de cada uno está en el propio archivo.
const BIO_PORTADA = "/kit/histok/images/bio-portada.svg";
const BIO_NUCLEOTIDO = "/kit/histok/images/bio-nucleotido.svg";
const BIO_BASES = "/kit/histok/images/bio-bases.svg";
const BIO_ANTIPARALELO = "/kit/histok/images/bio-antiparalelo.svg";
const BIO_HORQUILLA = "/kit/histok/images/bio-horquilla.svg";
const BIO_DOGMA = "/kit/histok/images/bio-dogma.svg";
const BIO_ADN_ARN = "/kit/histok/images/bio-adn-arn.svg";
const BIO_TIPOS_ARN = "/kit/histok/images/bio-tipos-arn.svg";
const BIO_SPLICING = "/kit/histok/images/bio-splicing.svg";
const BIO_TRADUCCION = "/kit/histok/images/bio-traduccion.svg";
const BIO_MUTAGENOS = "/kit/histok/images/bio-mutagenos.svg";
const BIO_CLASIFICACION = "/kit/histok/images/bio-clasificacion.svg";
const BIO_MARCO = "/kit/histok/images/bio-marco.svg";
const BIO_MUTACIONES = "/kit/histok/images/bio-mutaciones.svg";
const BIO_VARIABILIDAD = "/kit/histok/images/bio-variabilidad.svg";
const BIO_CROMOSOMAS = "/kit/histok/images/bio-cromosomas.svg";
const BIO_NODISYUNCION = "/kit/histok/images/bio-nodisyuncion.svg";
const BIO_SINDROMES = "/kit/histok/images/bio-sindromes.svg";
const BIO_GENOMA = "/kit/histok/images/bio-genoma.svg";
const BIO_BIOTECNOLOGIA = "/kit/histok/images/bio-biotecnologia.svg";
const BIO_RIESGOS = "/kit/histok/images/bio-riesgos.svg";
const BIO_VOCABULARIO = "/kit/histok/images/bio-vocabulario.svg";
const BIO_MENDEL = "/kit/histok/images/bio-mendel.svg";
const BIO_DOMINANCIA = "/kit/histok/images/bio-dominancia.svg";
const BIO_ABO = "/kit/histok/images/bio-abo.svg";
const BIO_PEDIGRI = "/kit/histok/images/bio-pedigri.svg";
const BIO_PUNNETT = "/kit/histok/images/bio-punnett.svg";

const biologiaI: Topic[] = [
  {
    slug: "adn-replicacion",
    label: "ADN y replicación",
    thumbnail: BIO_PORTADA,
    glossary: {
      "enlace fosfodiéster":
        "Unión química que engancha el carbono 3' de una pieza con el 5' de la que sigue.",
      purinas: "Bases de anillo doble: adenina y guanina.",
      pirimidinas: "Bases de anillo simple: timina y citosina.",
      antiparalelas:
        "Que van en sentidos contrarios: mientras una sube 5'→3', la de enfrente baja 3'→5'.",
      "fragmentos de Okazaki":
        "Los trozos sueltos que quedan cuando una cadena no se puede armar de un solo tirón.",
      semiconservativa:
        "Cada molécula hija se queda con una cadena vieja y una recién hecha.",
    },
    slides: [
      {
        image: BIO_PORTADA,
        title: "ADN y replicación",
        diagram: true,
        info: "La doble hélice del ADN: dos cadenas enrolladas una sobre la otra, unidas por los pares de bases.",
      },
      {
        image: BIO_NUCLEOTIDO,
        title: "El nucleótido",
        diagram: true,
        info: "Las tres partes de un nucleótido y los carbonos numerados del azúcar.",
        body: [
          "El ADN es una sola pieza repetida millones de veces. Cada una se engancha con la siguiente por un ",
          { term: "enlace fosfodiéster" },
          ", y por eso la cadena tiene dos extremos distintos: uno 5' y otro 3'. Esa dirección va a decidir después cómo se copia.",
        ],
      },
      {
        image: BIO_BASES,
        title: "A con T, C con G",
        diagram: true,
        info: "Los dos pares de bases, con sus puentes de hidrógeno.",
        body: [
          "Las ",
          { term: "purinas" },
          " son grandes y las ",
          { term: "pirimidinas" },
          " chicas. Como cada par junta una de cada tamaño, la hélice mide siempre lo mismo de ancho. El par C-G aguanta más: lo sostienen tres puentes de hidrógeno en vez de dos.",
        ],
      },
      {
        image: BIO_ANTIPARALELO,
        title: "Antiparalelismo",
        diagram: true,
        info: "Las dos cadenas del ADN con sus extremos 5' y 3' enfrentados.",
        body: [
          "Las dos cadenas son ",
          { term: "antiparalelas" },
          ", y la ADN polimerasa solo sabe trabajar hacia un lado: lee 3'→5' y construye 5'→3'. De ahí sale todo el enredo — una se puede copiar de corrido y la otra no.",
        ],
      },
      {
        image: BIO_HORQUILLA,
        title: "La horquilla",
        diagram: true,
        info: "La horquilla de replicación con las cinco enzimas y los fragmentos de Okazaki.",
        body: [
          "Topo desenrolla, helicasa abre, primasa marca, polimerasa construye, ligasa pega. La conductora sale de un tirón; la retrasada va al revés de la apertura, así que se arma en ",
          { term: "fragmentos de Okazaki" },
          ". Y la replicación es ",
          { term: "semiconservativa" },
          ": nada se hace desde cero.",
        ],
      },
    ],
  },
  {
    slug: "arn-expresion",
    label: "ARN y expresión génica",
    thumbnail: BIO_DOGMA,
    glossary: {
      transcripción:
        "Pasar un tramo de ADN a ARN, dentro del núcleo.",
      traducción:
        "Armar la cadena de aminoácidos siguiendo lo que dice el mensajero.",
      "ARN polimerasa": "La enzima que fabrica el ARN leyendo el ADN.",
      ribosoma: "La máquina del citoplasma donde se ensambla la proteína.",
      splicing:
        "Tijera y pegamento: se quitan los tramos que no sirven y se unen los que sí.",
      codón: "Grupo de tres letras seguidas del ARN, la unidad mínima que el ribosoma sabe leer.",
      anticodón: "El trío del ARN de transferencia que encaja, base por base, con el del mensajero.",
    },
    slides: [
      {
        image: BIO_DOGMA,
        title: "El dogma central",
        diagram: true,
        info: "El recorrido de la información genética: ADN, ARN y proteína.",
        body: [
          "El ADN nunca sale del núcleo: manda una copia. La ",
          { term: "transcripción" },
          " pasa el mensaje a ARN, el ARN viaja al citoplasma y ahí la ",
          { term: "traducción" },
          " lo vuelve proteína. El ADN además se duplica a sí mismo cuando la célula se va a dividir.",
        ],
      },
      {
        image: BIO_ADN_ARN,
        title: "ADN y ARN",
        diagram: true,
        info: "Las cuatro diferencias entre ADN y ARN, y la regla de conversión de bases.",
        body: [
          "Cambia el azúcar, hay una sola cadena y la timina se sustituye por uracilo. La que hace el trabajo es la ",
          { term: "ARN polimerasa" },
          ". Ojo con la trampa del examen: pasar de ADN a ARN no es copiar igual, es poner la base contraria.",
        ],
      },
      {
        image: BIO_TIPOS_ARN,
        title: "Los tres ARN",
        diagram: true,
        info: "Mensajero, de transferencia y ribosomal: qué hace cada uno.",
        body: [
          "Salen del mismo ADN pero no hacen lo mismo: uno lleva el recado, otro acarrea los ladrillos y el tercero es parte del ",
          { term: "ribosoma" },
          " mismo.",
        ],
      },
      {
        image: BIO_SPLICING,
        title: "Intrones y exones",
        diagram: true,
        info: "El corte y empalme del ARN: se eliminan los intrones y se unen los exones.",
        body: [
          "El ARN recién copiado es un borrador con relleno en medio. Antes de salir del núcleo pasa por el ",
          { term: "splicing" },
          ", y solo entonces vale la pena leerlo. El ARN se queda con la información que le sirve.",
        ],
      },
      {
        image: BIO_TRADUCCION,
        title: "Traducción",
        diagram: true,
        info: "El ribosoma leyendo el ARN mensajero mientras un ARN de transferencia trae su aminoácido.",
        body: [
          "El ribosoma avanza de tres en tres. Cada ",
          { term: "codón" },
          " del mensajero se encuentra con el ",
          { term: "anticodón" },
          " de un transferente que trae el aminoácido correcto. Empieza en AUG y se detiene en UAA, UAG o UGA.",
        ],
      },
    ],
  },
{
    slug: "mutaciones",
    label: "Mutaciones y variabilidad",
    thumbnail: BIO_MUTAGENOS,
    glossary: {
      "agente mutagénico":
        "Cualquier cosa del ambiente capaz de dañar el material hereditario.",
      somáticas: "Las que ocurren en el cuerpo y mueren con él.",
      germinales: "Las que ocurren en óvulos o espermatozoides y viajan a los hijos.",
      transición: "El cambio suave: una base por otra de su misma familia.",
      transversión: "El cambio brusco: se sustituye una base grande por una chica, o al revés.",
      "cambio de marco":
        "Meter o quitar una letra corre todo el texto de ahí en adelante y lo vuelve ilegible.",
      "sentido erróneo": "La proteína sale con una pieza equivocada en su lugar.",
      "sin sentido": "Aparece una orden de parar donde no correspondía.",
      "selección natural":
        "El ambiente decide cuáles individuos dejan más descendencia, y con ellos cuáles variantes se quedan.",
    },
    slides: [
      {
        image: BIO_MUTAGENOS,
        title: "¿Por qué muta el ADN?",
        diagram: true,
        info: "Las causas de las mutaciones: espontáneas y los tres tipos de agentes que las inducen.",
        body: [
          "Unas pasan solas, por errores de copiado que nadie provocó. Otras las causa un ",
          { term: "agente mutagénico" },
          ": químicos, radiación o ciertos virus. Todos llevamos alguna que nuestros papás no tenían.",
        ],
      },
      {
        image: BIO_CLASIFICACION,
        title: "Cómo se clasifican",
        diagram: true,
        info: "Los tres criterios de clasificación: tejido, efecto y nivel.",
        body: [
          "Tres preguntas distintas. ¿Dónde ocurrió? Las ",
          { term: "somáticas" },
          " no salen de ahí; las ",
          { term: "germinales" },
          " sí. ¿Cómo le fue al individuo? Benéfica, perjudicial o neutra. ¿Qué tan grande fue el daño? Una letra, un pedazo de cromosoma, o un cromosoma entero.",
        ],
      },
      {
        image: BIO_MARCO,
        title: "Cambios en la base",
        diagram: true,
        info: "Transición, transversión y cambio de marco, con un ejemplo de cada uno.",
        body: [
          "Una ",
          { term: "transición" },
          " apenas se nota; una ",
          { term: "transversión" },
          " altera más la forma de la hélice. Pero el peor es el ",
          { term: "cambio de marco" },
          ": no cambia una letra, cambia dónde empieza cada palabra.",
        ],
      },
      {
        image: BIO_MUTACIONES,
        title: "Qué le pasa a la proteína",
        diagram: true,
        info: "Los tres efectos posibles sobre la proteína, con la misma secuencia de partida.",
        body: [
          "La silenciosa no se nota, porque varios codones dan el mismo aminoácido. La de ",
          { term: "sentido erróneo" },
          " puede arruinar la función o no, según qué tan importante sea ese punto. La ",
          { term: "sin sentido" },
          " casi siempre es grave: corta la proteína antes de tiempo.",
        ],
      },
      {
        image: BIO_VARIABILIDAD,
        title: "De dónde sale la variedad",
        diagram: true,
        info: "La relación entre mutación, variabilidad genética y selección natural.",
        body: [
          "Solo la mutación inventa alelos nuevos; la reproducción sexual apenas los baraja. Sobre esa materia prima actúa la ",
          { term: "selección natural" },
          ", que no dirige nada: la mutación es al azar y el ambiente después pasa la factura.",
        ],
      },
    ],
  },
  {
    slug: "cromosomas-herencia",
    label: "Alteraciones cromosómicas",
    thumbnail: BIO_SINDROMES,
    glossary: {
      deleción: "Un pedazo se pierde y ya no vuelve.",
      duplicación: "Un pedazo aparece repetido dos veces o más.",
      inversión: "Un pedazo se da vuelta y queda al revés.",
      translocación: "Un pedazo se muda a un cromosoma de otro par.",
      "no disyunción":
        "El error de reparto: dos piezas que debían irse a células distintas se van juntas.",
      trisomía: "Hay tres copias donde debía haber dos.",
      monosomía: "Falta una de las dos copias.",
    },
    slides: [
      {
        image: BIO_CROMOSOMAS,
        title: "Cuando se rompe el cromosoma",
        diagram: true,
        info: "Las cuatro alteraciones de estructura, comparando el cromosoma antes y después.",
        body: [
          "Cuatro maneras de dañarlo: ",
          { term: "deleción" },
          ", ",
          { term: "duplicación" },
          ", ",
          { term: "inversión" },
          " y ",
          { term: "translocación" },
          ". Fijate en la última: tiene que ser hacia otro par, porque entre homólogos el intercambio es normal y no es mutación.",
        ],
      },
      {
        image: BIO_NODISYUNCION,
        title: "No disyunción",
        diagram: true,
        info: "Una meiosis normal comparada con una donde los cromosomas no se separan.",
        body: [
          "La ",
          { term: "no disyunción" },
          " deja un gameto cargado de más y otro incompleto. Si el cargado se fecunda sale una ",
          { term: "trisomía" },
          "; si es el otro, una ",
          { term: "monosomía" },
          ". Casi todas las enfermedades cromosómicas empiezan aquí.",
        ],
      },
      {
        image: BIO_SINDROMES,
        title: "Las cinco del examen",
        diagram: true,
        info: "Los cinco síndromes cromosómicos del temario, con su alteración y sus efectos.",
        body: [
          "Down, Edwards y Patau van con los números 21, 18 y 13 — de mayor a menor, y también de mayor a menor esperanza de vida. Klinefelter y Turner son de los cromosomas sexuales: un X de más o un X de menos.",
        ],
      },
    ],
  },
  {
    slug: "genoma-biotecnologia",
    label: "Genoma humano y biotecnología",
    thumbnail: BIO_GENOMA,
    glossary: {
      "Proyecto Genoma Humano":
        "El esfuerzo internacional que se propuso leer y ordenar todo el material hereditario de nuestra especie.",
      secuenciar: "Averiguar en qué orden exacto están las letras.",
      "terapia génica":
        "Tratar la enfermedad en su raíz en vez de tratar los síntomas.",
      biofármacos:
        "Medicinas que ya no se extraen de animales: las produce un organismo al que le pusimos el gen humano.",
      "línea germinal":
        "Las células reproductoras: lo que se toque ahí lo heredan también los nietos.",
      "discriminación genética":
        "Que a alguien le nieguen un trabajo o un seguro por lo que dice su ADN.",
    },
    slides: [
      {
        image: BIO_GENOMA,
        title: "El Proyecto Genoma Humano",
        diagram: true,
        info: "Las cifras del Proyecto Genoma Humano: años, pares de bases y número de genes.",
        body: [
          "El ",
          { term: "Proyecto Genoma Humano" },
          " se propuso ",
          { term: "secuenciar" },
          " los 3 200 millones de pares de bases de una persona. Trece años de trabajo para descubrir que tenemos unos 20 000 genes: bastante menos de lo que todos esperaban.",
        ],
      },
      {
        image: BIO_BIOTECNOLOGIA,
        title: "Para qué sirve",
        diagram: true,
        info: "Las cinco aplicaciones de la biotecnología genética en salud.",
        body: [
          "Saber leer el ADN cambió la medicina: se detecta la enfermedad antes de que aparezca, y con la ",
          { term: "terapia génica" },
          " se corrige el gen mismo. Los ",
          { term: "biofármacos" },
          " ya son rutina — la insulina de hoy la fabrican bacterias.",
        ],
      },
      {
        image: BIO_RIESGOS,
        title: "Lo que preocupa",
        diagram: true,
        info: "Riesgos ecológicos, sanitarios, sociales y bioéticos de la biotecnología.",
        body: [
          "Poder hacerlo no significa que se deba. Tocar la ",
          { term: "línea germinal" },
          " cambia a los que todavía no nacen y no pueden opinar. Y con los datos en la mano aparece la ",
          { term: "discriminación genética" },
          ": la pregunta ya no es qué se puede, sino quién decide.",
        ],
      },
    ],
  },
  {
    slug: "mendel-herencia",
    label: "Mendel y patrones de herencia",
    thumbnail: BIO_PUNNETT,
    glossary: {
      alelos: "Las versiones distintas que puede tener un mismo gen.",
      genotipo: "Las letras que llevás escritas, se noten o no.",
      fenotipo: "Lo que se ve por fuera.",
      heterocigoto: "Las dos versiones que lleva son diferentes.",
      homocigoto: "Las dos versiones que lleva son iguales.",
      "dominancia incompleta": "Ninguna de las dos gana y el resultado queda a medio camino.",
      codominancia: "Las dos se muestran enteras y al mismo tiempo.",
      portadora: "Lo lleva escrito pero no lo padece, y se lo puede pasar a un hijo.",
      hemicigoto: "Tiene una sola copia del gen, así que no hay con qué taparla.",
    },
    slides: [
      {
        image: BIO_VOCABULARIO,
        title: "El vocabulario",
        diagram: true,
        info: "Genotipo y fenotipo, homocigoto y heterocigoto, y los cromosomas sexuales.",
        body: [
          "Los ",
          { term: "alelos" },
          " son las variantes de un gen. El ",
          { term: "genotipo" },
          " es lo que está escrito y el ",
          { term: "fenotipo" },
          " lo que se ve — no siempre coinciden, porque un ",
          { term: "heterocigoto" },
          " esconde una versión detrás de la otra. El ",
          { term: "homocigoto" },
          " no esconde nada.",
        ],
      },
      {
        image: BIO_MENDEL,
        title: "Las tres leyes",
        diagram: true,
        info: "Las tres leyes de Mendel con su cruce y su proporción.",
        body: [
          "Los números son lo que cae en el examen: 3 : 1 en la segunda ley y 9 : 3 : 3 : 1 en la tercera. Y cuidado con la trampa — el 3 : 1 es de fenotipos; los genotipos van 1 : 2 : 1.",
        ],
      },
      {
        image: BIO_DOMINANCIA,
        title: "Cuando no gana el dominante",
        diagram: true,
        info: "Los cuatro patrones de dominancia con un ejemplo de cada uno.",
        body: [
          "Mendel trabajó con dominancia completa, pero no siempre es así. En la ",
          { term: "dominancia incompleta" },
          " la flor sale rosada, ni roja ni blanca. En la ",
          { term: "codominancia" },
          " no hay mezcla: se ven las dos, como en el grupo AB.",
        ],
      },
      {
        image: BIO_ABO,
        title: "Grupos sanguíneos",
        diagram: true,
        info: "Los cuatro grupos del sistema ABO con sus genotipos, antígenos y anticuerpos.",
        body: [
          "Tres alelos para un solo gen. El AB recibe de todos porque no fabrica anticuerpos contra nada; el O dona a todos porque no tiene antígenos que delatarlo. Aparte va el Rh: una madre Rh negativa con un bebé Rh positivo necesita seguimiento.",
        ],
      },
      {
        image: BIO_PEDIGRI,
        title: "Leer un pedigrí",
        diagram: true,
        info: "Un árbol familiar de herencia recesiva ligada al cromosoma X.",
        body: [
          "Si afecta sobre todo a hombres y salta generaciones, es recesiva ligada al X — hemofilia, daltonismo, Duchenne. El hijo la recibe de una madre ",
          { term: "portadora" },
          ", nunca del papá. El varón es ",
          { term: "hemicigoto" },
          " para todo lo que va en ese cromosoma.",
        ],
      },
      {
        image: BIO_PUNNETT,
        title: "El cuadro de Punnett",
        diagram: true,
        info: "El cuadro de Punnett del cruce del pedigrí, con los cuatro resultados.",
        body: [
          "Gametos del papá arriba, de la mamá al lado, y se llena combinando. Fijate en la respuesta: ninguna hija sale afectada, pero la mitad de los varones sí. Contá primero genotipos y después fenotipos — son cuentas distintas.",
        ],
      },
    ],
  },

];

export interface Semestre {
  slug: string;
  /** Lo que dice la carpeta: "1 Semestre". */
  label: string;
  materias: Materia[];
}

// 2 Semestre › Biología: el temario final repite toda la genética que ya vive
// en Biología I. Se reusan esas mismas secciones (no copias): una sola fuente,
// y ninguna imagen duplicada.
function deBiologiaI(slug: string): Topic {
  const t = biologiaI.find((x) => x.slug === slug);
  if (!t) throw new Error(`Biología I no tiene la sección "${slug}"`);
  return t;
}

// 2 Semestre › Sociales. Prueba final del II Semestre (miércoles 18 de
// noviembre), prof. Rudy Pérez. Sigue las fichas del curso, tema por tema; el
// tema 2 son tres conflictos y van por separado. Cifras: las del curso, salvo
// donde el curso tiene un dato desactualizado o equivocado — ahí el texto lo
// dice.
const sociales2S: Topic[] = [
  {
    slug: "china-mao-deng",
    label: "China: de Mao a Deng",
    thumbnail: "/kit/histok/images/s2-china-pudong.jpg",
    glossary: {
      "mundo multipolar":
        "Orden internacional con varios centros de poder que compiten e influyen a la vez, en lugar de uno o dos.",
      BRICS: "Grupo de economías emergentes formado por Brasil, Rusia, India, China y Sudáfrica.",
      Kuomintang:
        "Partido Nacionalista chino; gobernó la República de China hasta 1949 y después se refugió en Taiwán.",
      "reforma agraria":
        "Redistribución de la propiedad de la tierra: se quita a los grandes dueños para repartirla.",
      colectivización:
        "Unir las parcelas privadas en granjas colectivas, trabajadas en común y controladas por el Estado.",
      "plan quinquenal":
        "Programa del gobierno que fija metas de producción para cinco años.",
      "Gran Salto Adelante":
        "Campaña de Mao (1958) para industrializar China a toda prisa con el trabajo de los campesinos; acabó en una hambruna enorme.",
      "socialismo de mercado":
        "Sistema en el que el Partido Comunista conserva todo el poder, pero deja funcionar empresas privadas, precios libres e inversión extranjera.",
      "cuatro modernizaciones":
        "Las cuatro áreas que Deng Xiaoping puso como prioridad para desarrollar China.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-china-pudong.jpg",
        title: "El papel de China",
        info: "El horizonte de Pudong, en Shanghái, iluminado de noche. Foto de Wikimedia Commons, CC BY-SA 4.0.",
      },
      {
        image: "/kit/histok/images/s2-china-brics.jpg",
        title: "Un mundo multipolar",
        info: "Los líderes de los BRICS reunidos durante la cumbre del G20 en Osaka, Japón, el 28 de junio de 2019. Foto del gobierno de Brasil, CC BY 2.0.",
        body: [
          "En la Guerra Fría el mundo giraba alrededor de dos superpotencias. Hoy es un ",
          { term: "mundo multipolar" },
          ": Estados Unidos sigue al frente de la economía, pero comparte el tablero con China, la Unión Europea, Japón y Rusia, y con potencias regionales como Brasil, Turquía, Corea del Sur, India, Israel y Sudáfrica.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-nanjing.jpg",
        title: "China en cifras",
        info: "Multitudes al anochecer en la calle Nanjing Este, en Shanghái, mayo de 2025. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "Más de 1350 millones de habitantes según el curso (en 2023 India la superó como el país más poblado). Es la segunda economía del mundo, mide 9,6 millones de km², es el segundo mercado para productos extranjeros, tenía una clase media de 500 millones en 2015 y es el tercer mayor inversionista, detrás de EE. UU. y Japón. Dentro de los ",
          { term: "BRICS" },
          " hace entre el 50 % y el 85 % de las exportaciones.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-mao-chiang.jpg",
        title: "Los dos bandos",
        info: "Mao Zedong y Chiang Kai-shek brindan por la victoria sobre Japón en Chongqing, en septiembre de 1945, poco antes de volver a enfrentarse. Fotografía de dominio público.",
        body: [
          "La China moderna nace de una guerra civil entre dos bandos: el ",
          { term: "Kuomintang" },
          " de ",
          { name: "Chiang Kai-shek" },
          " y el Partido Comunista Chino de ",
          { name: "Mao Tse-Tung" },
          ". En 1949 ganaron los comunistas y Mao proclamó la República Popular China.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-reforma.jpg",
        title: "1949: un país de campesinos",
        info: "Un hombre lee la Ley de Reforma Agraria de la República Popular China, 1950. Fotografía de dominio público.",
        body: [
          "En 1949 China era rural, casi sin industria, con una economía rudimentaria y hambrunas que mataban a millones. El nuevo gobierno hizo una ",
          { term: "reforma agraria" },
          " contra los terratenientes y después impuso la ",
          { term: "colectivización" },
          ". Entre 1959 y 1961, esos cambios y el mal clima hundieron las cosechas: hambre otra vez.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-salto.jpg",
        title: "Los planes de Mao",
        info: "Un horno de patio para fundir acero durante el Gran Salto Adelante, 1958. El metal que salía de ellos casi nunca servía. Fotografía de dominio público.",
        body: [
          "Primero se nacionalizaron la gran industria, la banca y el comercio al por mayor; la pequeña y mediana empresa siguió en manos privadas. En 1953 llegó el primer ",
          { term: "plan quinquenal" },
          ", copiado del modelo soviético: creció la industria y se formaron técnicos. El segundo, en 1958, lanzó el ",
          { term: "Gran Salto Adelante" },
          ". En 1961 el país cayó en depresión económica.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-deng.jpg",
        title: "Deng Xiaoping",
        info: "Deng Xiaoping con el presidente Jimmy Carter en la ceremonia de bienvenida en la Casa Blanca, 29 de enero de 1979. Fotografía del gobierno de EE. UU., dominio público.",
        body: [
          "Mao murió en 1976 y los reformistas del partido, con ",
          { name: "Deng Xiaoping" },
          " al frente, liberalizaron la economía: impusieron el ",
          { term: "socialismo de mercado" },
          ". No hubo apertura política. Su frase lo resume: «No importa si el gato es blanco o negro, mientras cace ratones»; da igual de dónde venga la idea, si funciona.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-ciclo-deng.svg",
        title: "El ciclo de la reforma",
        diagram: true,
        info: "Esquema del ciclo de la reforma de Deng Xiaoping, según la presentación del curso.",
        body: [
          "China tenía muchísima gente para trabajar, así que podía pagar salarios bajos. Eso atrajo fábricas extranjeras; con esa inversión exportó muchísimo, entró dinero, los salarios subieron poco a poco, la gente consumió más y hubo más para invertir. Y el ciclo vuelve a empezar.",
        ],
      },
      {
        image: "/kit/histok/images/s2-china-shenzhen.jpg",
        title: "Las cuatro modernizaciones",
        info: "El distrito de Futian, en Shenzhen, en 2016. En 1980 Shenzhen era un pueblo de pescadores; fue la primera zona económica especial de la reforma. Foto de Wikimedia Commons, CC BY 3.0.",
        body: [
          "Las ",
          { term: "cuatro modernizaciones" },
          " fueron agricultura, industria, tecnología y defensa. En los 80 y 90 creció la industria pesada; el sector privado llegó a casi el 70 % del PIB en 2005, y entre 1978 y 2010 China creció un 9,5 % por año. Pasó de país pobre y rural a segunda economía del mundo.",
        ],
      },
    ],
  },
  {
    slug: "china-en-el-mundo",
    label: "China en el mundo",
    thumbnail: "/kit/histok/images/s2-mundo-addis.jpg",
    glossary: {
      "no injerencia":
        "Principio de no meterse en los asuntos internos de otro país: no condicionar la ayuda a cómo se gobierna.",
      "asociación estratégica":
        "Acuerdo de cooperación de largo plazo entre dos países en comercio, inversión y política.",
      "tratado de libre comercio":
        "Acuerdo entre países para bajar o eliminar los impuestos a lo que compran y venden entre sí.",
      CEPAL:
        "Comisión Económica para América Latina y el Caribe, el organismo de la ONU que estudia la economía de la región.",
      "capital mixto":
        "Empresa cuyo dinero viene de dos socios, por ejemplo una compañía china y una estatal del país.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-mundo-addis.jpg",
        title: "China en el mundo",
        info: "Un tren del tren ligero de Adís Abeba, Etiopía, en marzo de 2015: lo construyó y financió China. Foto de Wikimedia Commons, CC0.",
      },
      {
        image: "/kit/histok/images/s2-mundo-zambia.jpg",
        title: "África: petróleo y minerales",
        info: "La mina de cobre de Nchanga, cerca de Chingola, Zambia, en 2008. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "China es el principal socio comercial de África: ha movilizado 127 mil millones de dólares, el 70 % de ese comercio es energía y de ahí sale el 30 % del petróleo que importa. Ejemplos: Angola (petróleo, minas e infraestructura), Chad, Níger y el Congo (petróleo), Ghana (una refinería de aluminio) y Zambia (cobre).",
        ],
      },
      {
        image: "/kit/histok/images/s2-mundo-kilamba.jpg",
        title: "Lo que busca China en África",
        info: "Vista aérea de Kilamba, una ciudad nueva en Angola construida por una empresa estatal china, mayo de 2011. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "Busca los minerales para fabricar computadoras, teléfonos y televisores, y cambia materias primas y alimentos por inversión y productos industriales. Su regla es la ",
          { term: "no injerencia" },
          ". A la cumbre chino-africana de 2006 llegaron 48 líderes, y el apoyo chino amortigua las sanciones de Occidente a Zimbabue y Sudán.",
        ],
      },
      {
        image: "/kit/histok/images/s2-mundo-cosco.jpg",
        title: "América Latina",
        info: "El portacontenedores Cosco Hope, de la naviera estatal china COSCO, en el puerto de Hamburgo, octubre de 2014. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "China firmó una ",
          { term: "asociación estratégica" },
          " con Argentina, Brasil, México, Chile y Venezuela; Chile, Perú y Costa Rica firmaron un ",
          { term: "tratado de libre comercio" },
          ". Invierte en petróleo, gas, oro, litio, autos, bancos y obras, y presta créditos que se pagan en petróleo. Según la ",
          { term: "CEPAL" },
          ", en 2010 invirtió más de 15 mil millones de dólares.",
        ],
      },
      {
        image: "/kit/histok/images/s2-mundo-coca.jpg",
        title: "Venezuela y Ecuador",
        info: "La central hidroeléctrica Coca Codo Sinclair, en Ecuador, durante su construcción por una empresa china. Foto de Wikimedia Commons, CC BY-SA 2.0.",
        body: [
          "A Venezuela le compra petróleo directo; en 2010 le prestó 20 000 millones de dólares, mitad en dólares y mitad en yuanes, y tiene empresas de ",
          { term: "capital mixto" },
          " con la estatal PDVSA. En Ecuador, Andes Petroleum se volvió clave en el petróleo, la hidroeléctrica Coca Codo Sinclair pasó a una empresa china y el ejército compra armas chinas.",
        ],
      },
      {
        image: "/kit/histok/images/s2-mundo-petrobras.jpg",
        title: "Bolivia, Brasil, Cuba y Argentina",
        info: "La plataforma petrolera P-51 de Petrobras, Brasil, 2009. Foto de Agência Brasil, CC BY 3.0 BR.",
        body: [
          "Bolivia: la estatal YPFB se asoció con la china CNPC para producir gas. Brasil: empresas mixtas con Petrobras, 10 000 millones prestados para el petróleo de aguas profundas, y desde 2009 China es su primer comprador. Cuba: empresas mixtas con Cubaniquel. Argentina: 10 000 millones en 2010 para trenes, y China es el gran comprador de su soja.",
        ],
      },
      {
        image: "/kit/histok/images/s2-mundo-estadio.jpg",
        title: "Costa Rica y China",
        info: "El nuevo Estadio Nacional de Costa Rica, construido por China, días antes de su inauguración en marzo de 2011. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "En 2007 Costa Rica rompió con Taiwán, después de 60 años de relaciones, para abrirlas con la República Popular China. Las pruebas están a la vista: el Estadio Nacional lo construyó China, los presidentes de ambos países se visitaron, y el tratado de libre comercio entró en vigor el 1 de agosto de 2011.",
        ],
      },
    ],
  },
  {
    slug: "corea",
    label: "Corea",
    thumbnail: "/kit/histok/images/s2-corea-jsa.jpg",
    glossary: {
      "paralelo 38":
        "La línea imaginaria a 38° de latitud norte que se usó para partir Corea en dos.",
      "Consejo de Seguridad":
        "El órgano de la ONU que decide sobre la paz y la guerra; sus resoluciones obligan a los países.",
      "zona desmilitarizada":
        "Franja de unos 4 km de ancho, sin tropas, que separa a las dos Coreas desde 1953.",
      embargo:
        "Prohibición de comerciar o mover dinero con un país, como castigo.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-corea-jsa.jpg",
        title: "Corea",
        info: "Soldados de EE. UU. y de Corea del Sur vigilan la línea divisoria en el Área de Seguridad Conjunta de Panmunjom, octubre de 2015. Fotografía del Ejército de EE. UU., dominio público.",
      },
      {
        image: "/kit/histok/images/s2-corea-38.jpg",
        title: "La península dividida",
        info: "Las primeras tropas de la ONU en cruzar el paralelo 38 posan junto al letrero, 29 de septiembre de 1950. Fotografía del Ejército de EE. UU., dominio público.",
        body: [
          "Japón salió de Corea en 1945 y la península se partió en el ",
          { term: "paralelo 38" },
          ": la URSS ocupó el norte y EE. UU. el sur. En 1948 nacieron dos gobiernos: al norte, uno comunista con ",
          { name: "Kim Il Sung" },
          " y Kim Tubong; al sur, uno nacionalista con ",
          { name: "Syngman Rhee" },
          ", aliado de Occidente pero sin apoyo popular.",
        ],
      },
      {
        image: "/kit/histok/images/s2-corea-inchon.jpg",
        title: "La guerra (1950–1953)",
        info: "El teniente Baldomero López, de los marines de EE. UU., trepa el malecón durante el desembarco de Inchon, 15 de septiembre de 1950; murió minutos después. Fotografía del Cuerpo de Marines de EE. UU., dominio público.",
        body: [
          "En 1950 el norte invadió el sur. El ",
          { term: "Consejo de Seguridad" },
          " de la ONU condenó la agresión y armó un ejército multinacional. ",
          { name: "Truman" },
          " envió tropas al mando de ",
          { name: "Douglas MacArthur" },
          ", que desembarcó en Inchon y recuperó Seúl. Los norcoreanos retrocedieron hasta la frontera china, y entonces China entró en la guerra.",
        ],
      },
      {
        image: "/kit/histok/images/s2-corea-refugiada.jpg",
        title: "Lo que dejó la guerra",
        info: "Una niña coreana carga a su hermano a la espalda junto a un tanque detenido, en Haengju, el 9 de junio de 1951. Fotografía de la Marina de EE. UU., dominio público.",
        body: [
          "Un millón de muertos y una tensión que no terminó nunca. El norte quedó atrasado y el sur se desarrolló. El norte armó un programa nuclear, y en 2010 bombardeó la isla surcoreana de Yeonpyeong. La guerra terminó con un armisticio, no con un tratado de paz: técnicamente, sigue.",
        ],
      },
      {
        image: "/kit/histok/images/s2-corea-familias.jpg",
        title: "Familias partidas",
        info: "El Altar de la Paz en Imjingak, junto a la zona desmilitarizada, en Corea del Sur: el parque al que van quienes tienen familia al otro lado. Foto de Lance Vanlewen, 2018, CC BY-SA 4.0.",
        body: [
          "Diez millones de familias quedaron separadas, sin cartas, llamadas ni correos. Desde 2000, solo 20 000 personas se han reencontrado en 18 encuentros. En los 70 hubo intentos de unificación sin éxito; el norte se alejó de los soviéticos; en 1991 las dos Coreas entraron a la ONU, y en 1992 el norte dejó inspeccionar su programa nuclear, pero después lo bloqueó.",
        ],
      },
      {
        image: "/kit/histok/images/s2-corea-hoy.jpg",
        title: "Corea hoy",
        info: "Kim Jong-un y Donald Trump se dan la mano en la cumbre de Singapur, 12 de junio de 2018, la primera entre un líder norcoreano y un presidente de EE. UU. Fotografía de la Casa Blanca, dominio público.",
        body: [
          "Hubo cumbres en 2000 y 2007, pero las pruebas nucleares de 2006 y 2009 lo enfriaron todo. En 2011 murió ",
          { name: "Kim Jong-il" },
          " y lo sucedió su hijo ",
          { name: "Kim Jong-un" },
          ". China, Irán y Rusia apoyan al norte; Japón y EE. UU., al sur. La ONU ha aprobado el ",
          { term: "embargo" },
          " de cuentas y transacciones, y la ",
          { term: "zona desmilitarizada" },
          " sigue partiendo la península.",
        ],
      },
    ],
  },
  {
    slug: "israel-palestina-origen",
    label: "Israel y Palestina: el origen",
    thumbnail: "/kit/histok/images/s2-ip-jerusalen.jpg",
    glossary: {
      "sunitas y chiitas":
        "Las dos ramas principales del islam; se separaron por quién debía suceder a Mahoma.",
      "mandato británico":
        "Territorio que la Sociedad de Naciones entregó al Reino Unido para administrarlo tras la Primera Guerra Mundial.",
      partición: "División de un territorio en dos o más Estados nuevos.",
      "Liga Árabe":
        "Organización de los Estados árabes fundada en 1945 en El Cairo.",
      "Ley del Retorno":
        "Ley israelí de 1950 que da a todo judío del mundo el derecho a emigrar a Israel y hacerse ciudadano.",
      asentamientos:
        "Poblaciones israelíes construidas en los territorios ocupados en 1967.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-ip-jerusalen.jpg",
        title: "Israel y Palestina",
        info: "El Muro de los Lamentos y, detrás, la Cúpula de la Roca, en Jerusalén: lugares sagrados del judaísmo y del islam, a pocos metros. Foto de 2017, CC BY 2.0.",
      },
      {
        image: "/kit/histok/images/s2-ip-liga.jpg",
        title: "Por qué importa esa región",
        info: "Mapa del periódico estadounidense Sunday News, julio de 1946, con los países miembros de la Liga Árabe. Dominio público.",
        body: [
          "Tiene ricos yacimientos de petróleo y gas, y una ubicación estratégica: es el puente entre Europa y el sureste de Asia. Y carga conflictos religiosos y étnicos: entre ",
          { term: "sunitas y chiitas" },
          ", y entre árabes e israelíes.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-1948.jpg",
        title: "1947–1948: nace Israel",
        info: "David Ben-Gurión lee la Declaración de Independencia de Israel en Tel Aviv, 14 de mayo de 1948. Fotografía de dominio público.",
        body: [
          "Palestina era un ",
          { term: "mandato británico" },
          " de mayoría musulmana, con una comunidad judía importante. En 1947 la ONU propuso su ",
          { term: "partición" },
          " en un Estado judío y uno palestino, para acoger a los judíos que sobrevivieron al Holocausto. En 1948 los británicos se fueron y ",
          { name: "David Ben-Gurión" },
          " proclamó el Estado de Israel. Los palestinos no lo aceptaron, y los países de la ",
          { term: "Liga Árabe" },
          " le declararon la guerra.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-eilat.jpg",
        title: "La primera guerra (1948–1949)",
        info: "Soldados israelíes izan una bandera dibujada a tinta en Umm Rashrash, hoy Eilat, sobre el mar Rojo, el 10 de marzo de 1949: el último acto de la guerra. Fotografía de dominio público.",
        body: [
          "El 15 de mayo de 1948 atacaron Egipto, Siria, Jordania, Irak y Líbano. Ganó Israel: se quedó con el puerto de Eilat, sobre el mar Rojo, sumó un 40 % más de lo que le daba la ONU y llegó a controlar el 78 % de Palestina. Con la ",
          { term: "Ley del Retorno" },
          ", judíos de todo el mundo emigraron a Israel.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-refugiados.jpg",
        title: "La Palestina árabe desaparece",
        info: "Refugiados palestinos durante la guerra de 1948, en el mandato británico de Palestina. Fotografía de dominio público.",
        body: [
          "El territorio se repartió: Transjordania se anexó Jerusalén Este y Cisjordania, y Egipto pasó a administrar Gaza. Más de 900 000 palestinos se exiliaron en Líbano, Egipto, Siria y Jordania, o quedaron en campamentos miserables. Su causa quedó en manos del Movimiento Nacionalista Árabe, y EE. UU., Gran Bretaña y Francia garantizaron las fronteras de Israel.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-muro.jpg",
        title: "Lo que sigue en disputa",
        info: "La barrera que Israel levantó en Cisjordania, fotografiada en agosto de 2004. Foto de Wikimedia Commons, CC BY 2.0.",
        body: [
          "Quién manda en Gaza y Cisjordania, y si ahí nace un Estado palestino. Jerusalén Este, los Altos del Golán y las granjas de Shebaa. Los ",
          { term: "asentamientos" },
          " y los refugiados. Que ambos se reconozcan. Y los vecinos: con Egipto y Jordania, Israel tiene tratados de paz; con Siria y Líbano, y con grupos como Hamás y la Yihad Islámica, no.",
        ],
      },
    ],
  },
  {
    slug: "israel-palestina-guerras",
    label: "Israel y Palestina: las guerras",
    thumbnail: "/kit/histok/images/s2-ip-paracaidistas.jpg",
    glossary: {
      "Canal de Suez":
        "Canal artificial de Egipto que une el Mediterráneo con el mar Rojo; acorta la ruta entre Europa y Asia.",
      "Yom Kippur":
        "El Día del Perdón, la fiesta más sagrada del judaísmo.",
      "Camp David":
        "Residencia de descanso del presidente de EE. UU. donde Egipto e Israel firmaron sus acuerdos de paz en 1978.",
      OLP: "Organización para la Liberación de Palestina, que reunió a los grupos palestinos desde 1964.",
      "Autoridad Nacional Palestina":
        "El gobierno palestino creado en 1994 tras los Acuerdos de Oslo, con poder sobre partes de Gaza y Cisjordania.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-ip-paracaidistas.jpg",
        title: "Las guerras",
        info: "Paracaidistas israelíes ante el Muro de los Lamentos tras tomar la ciudad vieja de Jerusalén, 7 de junio de 1967. Foto de David Rubinger, dominio público.",
      },
      {
        image: "/kit/histok/images/s2-ip-suez.jpg",
        title: "Suez, 1956",
        info: "Humo de los depósitos de petróleo junto al Canal de Suez, en Port Said, tras el ataque anglo-francés del 5 de noviembre de 1956. Fotografía de dominio público.",
        body: [
          "El presidente egipcio ",
          { name: "Gamal Abdel Nasser" },
          " nacionalizó el ",
          { term: "Canal de Suez" },
          ", controlado por británicos y franceses. Reino Unido, Francia e Israel atacaron, e Israel invadió el Sinaí. La presión de EE. UU. y la URSS los obligó a retirarse: Egipto se quedó con el canal, británicos y franceses perdieron influencia y Nasser salió fortalecido.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-1967.jpg",
        title: "Seis Días, 1967",
        diagram: true,
        info: "Mapa de Israel (claro) y de los territorios que ocupó en la Guerra de los Seis Días (beige), con rótulos en inglés: Gaza, Cisjordania (West Bank), el Sinaí y los Altos del Golán. Mapa de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "Egipto bloqueó el estrecho de Tirán y movió tropas al Sinaí, aliado con Siria y Jordania. Israel respondió con un ataque aéreo sorpresa y ganó en seis días (5 al 10 de junio). Ocupó Gaza, Cisjordania, el Sinaí, Jerusalén Este y los Altos del Golán, y empezó a expropiar tierras e instalar colonos.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-yomkippur.jpg",
        title: "Yom Kippur, 1973",
        info: "Soldados marroquíes sobre un tanque en los Altos del Golán durante la guerra de 1973: Marruecos apoyó a Siria y Egipto. Fotografía de dominio público.",
        body: [
          "El 6 de octubre de 1973, día del ",
          { term: "Yom Kippur" },
          ", Siria y Egipto atacaron por sorpresa, apoyados por Irak, Jordania, Marruecos y la URSS. EE. UU. le mandó armas a Israel por un puente aéreo, e Israel contraatacó. La ONU aprobó el cese al fuego el 22 de octubre, e Israel conservó lo que había ocupado en 1967.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-campdavid.jpg",
        title: "La paz con Egipto",
        info: "Menájem Beguín, Jimmy Carter y Anwar el-Sadat en Camp David, septiembre de 1978. Fotografía del gobierno de EE. UU., dominio público.",
        body: [
          "Tras la guerra, Egipto e Israel negociaron. En Ginebra, en 1975, Israel se comprometió a dejar el canal de Suez y Egipto a no atacar más. En ",
          { term: "Camp David" },
          ", en 1978, ",
          { name: "Anwar el-Sadat" },
          " y ",
          { name: "Menájem Beguín" },
          " acordaron que Israel devolvería el Sinaí poco a poco, y Egipto no volvería a atacarlo y le vendería petróleo.",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-oslo.jpg",
        title: "Cómo cambió el mapa",
        info: "Isaac Rabin y Yasser Arafat se dan la mano frente a Bill Clinton, tras firmar los Acuerdos de Oslo en la Casa Blanca, 13 de septiembre de 1993. Fotografía de dominio público.",
        body: [
          "Antes de 1948: mandato británico. En 1947, el plan de la ONU, aprobado sin consultar a los palestinos, dejaba Jerusalén como zona internacional. De 1949 a 1967, Palestina quedó como territorio ocupado: solo el 22 % de su superficie histórica, donde la ",
          { term: "OLP" },
          " quería su Estado. En 1994 nació la ",
          { term: "Autoridad Nacional Palestina" },
          ".",
        ],
      },
      {
        image: "/kit/histok/images/s2-ip-iron.jpg",
        title: "Hoy",
        info: "El sistema antimisiles israelí Cúpula de Hierro intercepta cohetes lanzados desde Gaza hacia Ashdod, julio de 2014. Foto de las Fuerzas de Defensa de Israel, CC BY 2.0.",
        body: [
          "Ataques terroristas, cohetes y bombardeos; niños usados para cargar armas o como escudos humanos; una cultura del odio que se enseña a los jóvenes. Según el libro, tras 65 años de conflicto había más de 50 000 muertos y 400 000 desplazados. La guerra de Gaza que empezó en 2023 multiplicó esas cifras.",
        ],
      },
    ],
  },
  {
    slug: "rusia-georgia-ucrania",
    label: "Rusia: Georgia y Ucrania",
    thumbnail: "/kit/histok/images/s2-rusia-kremlin.jpg",
    glossary: {
      Gazprom: "La empresa rusa de gas natural, la más poderosa del mundo en su ramo; la controla el Estado.",
      oleoducto: "Tubería de cientos de kilómetros que lleva petróleo de un lugar a otro.",
      Euromaidán:
        "Ola de protestas en Kiev, de noviembre de 2013 a febrero de 2014, a favor de acercarse a la Unión Europea.",
      referéndum: "Votación en la que la población acepta o rechaza una decisión concreta.",
      "guerra de desgaste":
        "Guerra en la que ningún bando avanza mucho y cada uno intenta agotar los recursos del otro.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-rusia-kremlin.jpg",
        title: "Rusia: Georgia y Ucrania",
        info: "El Kremlin de Moscú y la orilla del río Moscova vistos desde el puente Bolshói Moskvoretski, 2011. Foto de Wikimedia Commons, CC BY 3.0.",
      },
      {
        image: "/kit/histok/images/s2-rusia-putin.jpg",
        title: "El rol de Rusia",
        info: "Vladímir Putin, presidente de Rusia, el 20 de febrero de 2020. Foto de la agencia TASS, CC BY 4.0.",
        body: [
          { name: "Vladímir Putin" },
          " controla la política y la economía. Rusia tiene tecnología, petróleo y gas, y ",
          { term: "Gazprom" },
          ". Ha intervenido en Chechenia, Georgia (2008), Crimea (2014) y Ucrania, y se opuso a atacar al sirio Bashar al-Asad y al programa nuclear iraní.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-osetia.jpg",
        title: "Georgia, 2008",
        info: "Un tanque ruso en Osetia del Sur durante la guerra de agosto de 2008. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "Abjasia y Osetia del Sur querían separarse de Georgia, y en 2008 Rusia intervino directamente. El presidente georgiano ",
          { name: "Mijeíl Saakashvili" },
          " era antirruso y nacionalista; Rusia respondió subiéndole el precio de la energía. Hubo 2000 muertos y más de 100 000 desplazados de Osetia del Sur hacia Osetia del Norte, en Rusia. Los dos bandos se acusaron de genocidio y limpieza étnica.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-btc.jpg",
        title: "Por qué Georgia importa",
        diagram: true,
        info: "Mapa del oleoducto Bakú–Tiflis–Ceyhan, de Azerbaiyán a Turquía atravesando Georgia. Mapa de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "Por Georgia sale el petróleo y el gas del mar Caspio y Asia Central. EE. UU. impulsó el ",
          { term: "oleoducto" },
          " Bakú–Tiflis–Ceyhan, de Azerbaiyán a Turquía, que cruza Georgia sin tocar Rusia. Por eso el Cáucaso es otro punto de tensión: amenaza el monopolio ruso sobre las rutas de la energía.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-rada.jpg",
        title: "Ucrania",
        info: "La Rada Suprema, el parlamento de Ucrania, en Kiev, 2009. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "Es la más fuerte de las antiguas repúblicas soviéticas, después de Rusia. Desde los 90 choca con Rusia por Crimea, que quería volver a Rusia (algo que el presidente ",
          { name: "Leonid Kravchuk" },
          " no aceptaba), y desde 1994 por el suministro de gas, con tensiones que casi terminan en guerra.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-maidan.jpg",
        title: "El Euromaidán",
        info: "Manifestantes del Euromaidán en Kiev, 27 de noviembre de 2013. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "El ",
          { term: "Euromaidán" },
          " llenó la Plaza de la Independencia de Kiev bajo el lema «Ucrania es Europa», contra el gobierno de ",
          { name: "Víktor Yanukóvich" },
          ", que había preferido a Rusia. La policía reprimió, aparecieron manifestantes armados y hubo muertos. Yanukóvich fue destituido y se formó un gobierno interino.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-crimea.jpg",
        title: "Crimea, 2014",
        info: "Soldados sin insignias rodean la base militar ucraniana de Perevalne, en Crimea, el 9 de marzo de 2014. Foto de Anton Holoborodko, CC BY-SA 3.0.",
        body: [
          "Crimea, donde cerca del 58 % de la gente es rusa, no reconoció al gobierno interino. En marzo de 2014 un ",
          { term: "referéndum" },
          " aprobó con el 97 % unirse a Rusia —la ONU no lo reconoce—, y el ejército ucraniano se retiró. EE. UU., el G-7 y la Unión Europea sancionaron a Rusia. En mayo, Donetsk y Lugansk votaron separarse, y empezó la guerra en el este de Ucrania.",
        ],
      },
      {
        image: "/kit/histok/images/s2-rusia-bucha.jpg",
        title: "La invasión de 2022",
        info: "Vehículos militares rusos destruidos en la calle principal de Bucha, cerca de Kiev, 6 de abril de 2022. Foto de Wikimedia Commons, CC BY 3.0.",
        body: [
          "El 24 de febrero de 2022 Rusia invadió Ucrania a gran escala y avanzó hacia Kiev. Ucrania la frenó y recuperó territorio; Rusia se concentró en Donetsk, Lugansk, Zaporiyia y Jersón. En 2023 y 2024 fue una ",
          { term: "guerra de desgaste" },
          ", con misiles y drones. Hasta septiembre de 2026 no había un acuerdo de paz definitivo.",
        ],
      },
    ],
  },
  {
    slug: "limpiezas-etnicas",
    label: "Limpiezas étnicas y derechos humanos",
    thumbnail: "/kit/histok/images/s2-etnia-srebrenica.jpg",
    glossary: {
      "limpieza étnica":
        "Expulsar a la fuerza a una población de un territorio por razones políticas, religiosas, nacionalistas, racistas o ideológicas; suele venir con violencia y masacres.",
      genocidio:
        "Política de matar masivamente a un grupo humano para destruirlo; por ejemplo, lo que hicieron los nazis en Europa.",
      "Acuerdo de Arusha":
        "Acuerdo de paz firmado en Tanzania en el año 2000 para terminar la guerra civil de Burundi.",
      "Estado Islámico":
        "Grupo yihadista que en 2014 proclamó un califato en partes de Irak y Siria.",
      "lesa humanidad":
        "Crímenes graves y sistemáticos contra la población civil, como asesinato, tortura o persecución.",
      interculturalidad:
        "Relacionarse entre culturas con respeto, diálogo y escucha mutua, sin que ningún grupo esté por encima de otro.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-etnia-srebrenica.jpg",
        title: "Limpiezas étnicas y derechos humanos",
        info: "Lápidas en el memorial de Potočari, cerca de Srebrenica, por las víctimas de la masacre de 1995 en Bosnia. Foto de 2009, CC BY-SA 3.0.",
      },
      {
        image: "/kit/histok/images/s2-etnia-berlin.jpg",
        title: "Dos palabras distintas",
        info: "Detalle del Monumento a los Judíos de Europa Asesinados, en Berlín, julio de 2014. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "No son sinónimos: la ",
          { term: "limpieza étnica" },
          " y el ",
          { term: "genocidio" },
          " se parecen, pero no buscan lo mismo. En los dos casos se violan los mismos derechos: la paz, la libertad de expresión, el libre tránsito y, sobre todo, la vida.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-kosovo.jpg",
        title: "Yugoslavia, Bosnia y Kosovo",
        info: "Refugiados albano-kosovares en Albania, 1999. Foto de Wikimedia Commons, CC BY 4.0.",
        body: [
          "Entre 1991 y 1999. Tras la muerte de ",
          { name: "Tito" },
          " crecieron los nacionalismos, y ",
          { name: "Slobodan Milošević" },
          " lanzó una «limpieza» contra las otras etnias. El libro registra 278 800 muertos en Bosnia, y más de un millón y medio de albano-kosovares tuvieron que huir. La OTAN intervino en Bosnia desde 1994.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-kigali.jpg",
        title: "Ruanda, 1994",
        info: "Los jardines del Memorial del Genocidio de Kigali, Ruanda, con la ciudad al fondo, 2012. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "La rivalidad entre hutus y tutsis explotó cuando murió el presidente ",
          { name: "Juvénal Habyarimana" },
          ", al ser derribado su avión. En unos cien días mataron entre 800 000 y un millón de personas. Las tropas extranjeras se retiraron en vez de frenarlo. Dejó millones de refugiados y desembocó en las guerras del Congo.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-burundi.jpg",
        title: "Burundi (1993–2005)",
        info: "Niños refugiados de Burundi en el campamento de Mtendeli, en Kigoma, Tanzania. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "La misma tensión entre hutus y tutsis venía desde la independencia. En 1993 asesinaron al presidente ",
          { name: "Melchior Ndadaye" },
          ", el primer hutu elegido, y empezó una guerra civil con más de 300 000 muertos. El ",
          { term: "Acuerdo de Arusha" },
          ", del año 2000, abrió el camino a la paz.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-sudan.jpg",
        title: "Sudán del Sur (2013–hoy)",
        info: "Desplazados por la guerra refugiados en la catedral de Santa María Auxiliadora, en Wau, Sudán del Sur, diciembre de 2016. Foto de Jill Craig, Voz de América, dominio público.",
        body: [
          "El país más nuevo del mundo cayó en guerra por una pugna política y étnica entre el presidente ",
          { name: "Salva Kiir" },
          ", dinka, y su vicepresidente ",
          { name: "Riek Machar" },
          ", nuer. Más de dos millones y medio de desplazados y una crisis alimentaria.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-yazidi.jpg",
        title: "El Estado Islámico (2014–hoy)",
        info: "Refugiados yazidíes que huyeron del Estado Islámico llegan al campamento de Newroz, en Siria, agosto de 2014. Foto del Departamento para el Desarrollo Internacional del Reino Unido, CC BY 2.0.",
        body: [
          "El ",
          { term: "Estado Islámico" },
          " persiguió a quienes consideraba traidores: kurdos, chiitas y minorías religiosas. En 2014 asesinó, esclavizó y expulsó a los yazidíes de Sinyar, en Irak. Provocó desplazamientos masivos.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-goma.jpg",
        title: "Lo que se repite",
        info: "El campamento de refugiados de Kibumba, en Goma (Zaire, hoy Congo), adonde huyeron más de un millón de ruandeses, 3 de agosto de 1994. Fotografía del Departamento de Defensa de EE. UU., CC0.",
        body: [
          "Fronteras artificiales: Ruanda, Burundi y Sudán heredaron divisiones coloniales que ignoraron etnias y religiones. Líderes que usan la identidad para ganar poder: Milošević, Kiir, Machar. Millones de desplazados. Y una respuesta internacional tardía: la OTAN en Bosnia desde 1994; en Ruanda, las tropas se fueron.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-rohingya.jpg",
        title: "Hoy también pasa",
        info: "El campamento de refugiados de Kutupalong, en Bangladesh, donde viven cientos de miles de rohinyás, marzo de 2017. Foto de John Owens, Voz de América, dominio público.",
        body: [
          "Rohinyás en Myanmar (2017): más de 700 000 huyeron a Bangladesh, y la ONU lo llamó limpieza étnica. Darfur, Sudán (desde 2023): violencia contra pueblos no árabes como los masalit. Uigures en China: la ONU señala posibles crímenes de ",
          { term: "lesa humanidad" },
          ", y China lo niega. Tigray, Etiopía (2020–2022). Nagorno-Karabaj (2023): más de 100 000 armenios huyeron en días.",
        ],
      },
      {
        image: "/kit/histok/images/s2-etnia-gacaca.jpg",
        title: "La alternativa",
        info: "Un tribunal gacaca en Ruanda, 2006: juicios comunitarios, al aire libre, a los acusados del genocidio, para hacer justicia y reconciliar. Foto de Wikimedia Commons, CC BY 2.0.",
        body: [
          "La respuesta del curso es la ",
          { term: "interculturalidad" },
          ", sostenida en tres pilares. Tolerancia: la base de la convivencia y de los derechos humanos. Diálogo: los conflictos se resuelven conversando y concertando. Justicia: enfrentar la injusticia y la desigualdad, que son los verdaderos obstáculos.",
        ],
      },
    ],
  },
  {
    slug: "latinoamerica-hoy",
    label: "América Latina desde los noventa",
    thumbnail: "/kit/histok/images/s2-latam-cartagena.jpg",
    glossary: {
      Mercosur:
        "Mercado Común del Sur: bloque comercial de Argentina, Brasil, Paraguay y Uruguay, creado en 1991.",
      "DR-CAFTA":
        "Tratado de libre comercio entre Estados Unidos, Centroamérica y República Dominicana.",
      Unasur: "Unión de Naciones Suramericanas, creada en 2008 para integrar políticamente a Suramérica.",
      neoliberalismo:
        "Modelo que reduce el papel del Estado en la economía y deja más espacio al mercado y a la empresa privada.",
      "inversión extranjera directa":
        "Dinero que una empresa de otro país pone en fábricas, tierras o negocios dentro del país.",
      privatizar: "Vender a dueños privados una empresa o un servicio que era del Estado.",
      "pacto social":
        "Acuerdo amplio entre gobierno, partidos, empresarios y trabajadores sobre el rumbo del país.",
      narcocorridos: "Canciones populares que narran y celebran la vida de los narcotraficantes.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-latam-cartagena.jpg",
        title: "América Latina desde los noventa",
        info: "Jefes de Estado en la VI Cumbre de las Américas, en Cartagena de Indias, Colombia, abril de 2012. Foto de la Presidencia de la Nación Argentina, CC BY-SA 2.0.",
      },
      {
        image: "/kit/histok/images/s2-latam-unasur.jpg",
        title: "Integrarse",
        info: "Presidentes suramericanos en la cumbre que fundó la Unasur, en Brasilia, 23 de mayo de 2008. Foto de Agência Brasil, CC BY 3.0 BR.",
        body: [
          "Desde los noventa la región buscó integrarse: el ",
          { term: "Mercosur" },
          ", el ",
          { term: "DR-CAFTA" },
          ", los tratados de libre comercio y la ",
          { term: "Unasur" },
          " (2008). En la VI Cumbre de las Américas, en Cartagena (2012), el tema de Cuba dominó la discusión; tres años después Cuba y EE. UU. restablecieron relaciones.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-bolsa.jpg",
        title: "La crisis de los ochenta",
        info: "El edificio de la Bolsa de Comercio de Santiago, Chile, 2022. Chile fue el primer país de la región en aplicar las reformas de mercado. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "Faltaba dinero: los precios de las materias primas subían y bajaban sin control. La salida fue el ",
          { term: "neoliberalismo" },
          ": liberar el comercio, recortar el gasto y ",
          { term: "privatizar" },
          ", para que circularan capitales y mercancías y llegara ",
          { term: "inversión extranjera directa" },
          ". Chile y Argentina empezaron; en 1990 se extendió con la globalización.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-cacerolazo.jpg",
        title: "Lo que dejaron las reformas",
        info: "Un cacerolazo en Argentina durante la crisis de 2001-2002: la gente protesta contra los bancos que congelaron sus ahorros. Foto de Wikimedia Commons, CC BY-SA 3.0.",
        body: [
          "Descentralizar dio más poder a lo local, pero también corrupción y despilfarro. Privatizar funcionó a corto plazo y dejó desempleo a largo plazo. Desregular atrajo inversión extranjera. Resultado: desigualdad, crisis violentas, fábricas que se fueron, y varios países que giraron de vuelta hacia más Estado.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-dilma.jpg",
        title: "Argentina, Brasil y Venezuela",
        info: "Sesión de la Cámara de Diputados de Brasil que votó el juicio político contra Dilma Rousseff, abril de 2016. Foto de Agência Brasil, CC BY 2.0.",
        body: [
          "Argentina: el kirchnerismo gobernó de 2003 a 2015, y ",
          { name: "Mauricio Macri" },
          " giró al neoliberalismo. Brasil: recesión desde 2014, destitución de ",
          { name: "Dilma Rousseff" },
          " y giro con Michel Temer en 2016. Venezuela: el socialismo del siglo XXI, con 56 % de inflación y 25 000 muertes violentas en 2013.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-bachelet.jpg",
        title: "Chile y Ecuador",
        info: "La presidenta Michelle Bachelet expone los logros de la Reforma Educacional, septiembre de 2016. Foto del Gobierno de Chile, CC BY 2.0.",
        body: [
          "Chile: Allende en 1970, el golpe de Pinochet en 1973, democracia desde 1990, y ",
          { name: "Michelle Bachelet" },
          " impulsó una reforma educativa. Ecuador: ",
          { name: "Rafael Correa" },
          ", desde 2007, subió la inversión social cerca de un 50 %, pero cuando el precio del petróleo cayó a la mitad, el modelo se resintió.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-evo.jpg",
        title: "Cuatro rumbos, una lección",
        info: "Evo Morales, presidente de Bolivia de 2006 a 2019, en enero de 2018. Foto de Wikimedia Commons, CC BY-SA 4.0.",
        body: [
          "Perú giró al neoliberalismo (Kuczynski, 2016); Colombia se abrió y es la cuarta economía de la región; en Bolivia ",
          { name: "Evo Morales" },
          " nacionalizó sectores clave; México tuvo gobiernos neoliberales estables, con desempleo y pobreza. La lección: la estabilidad no depende solo de la ideología. Hace falta un plan claro, un ",
          { term: "pacto social" },
          " y un Estado que lidere sin dañar la democracia.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-coca.jpg",
        title: "El narcotráfico",
        info: "Tripulantes del guardacostas estadounidense Tahoma descargan fardos de cocaína decomisados, agosto de 2010. Fotografía de la Guardia Costera de EE. UU., dominio público.",
        body: [
          "Transforma cuatro ámbitos. Cultural: series y ",
          { term: "narcocorridos" },
          ". Social: más violencia por el control de territorios. Económico: un kilo cuesta 2348 dólares en Colombia y 32 500 en EE. UU. Político: financia campañas.",
        ],
      },
      {
        image: "/kit/histok/images/s2-latam-semisub.jpg",
        title: "Centroamérica, el puente",
        info: "Un semisumergible cargado de cocaína interceptado en el océano Pacífico, agosto de 2007. Fotografía de la Oficina de Aduanas y Protección Fronteriza de EE. UU., dominio público.",
        body: [
          "La droga va de Suramérica a Centroamérica y de ahí a EE. UU.: el 90 % de la que sale de Suramérica pasa por Centroamérica, unos 900 000 kilos de cocaína al año. Los carteles mexicanos administran el negocio y otros grupos hacen de transportistas.",
        ],
      },
    ],
  },
  {
    slug: "cuantos-somos",
    label: "Dinámica poblacional",
    thumbnail: "/kit/histok/images/s2-pob-shibuya.jpg",
    glossary: {
      demografía:
        "Ciencia social que estudia la población humana —cómo se distribuye, cómo está compuesta y cómo cambia— con datos estadísticos.",
      natalidad: "Nacimientos vivos en un año por cada 1000 habitantes.",
      fecundidad: "Nacimientos en un año por cada 1000 mujeres de 15 a 49 años.",
      mortalidad: "Muertes en un año por cada 1000 habitantes.",
      densidad: "Habitantes por kilómetro cuadrado.",
      "crecimiento natural": "Nacimientos menos muertes.",
      "crecimiento real": "El crecimiento natural más los inmigrantes y menos los emigrantes.",
      "pirámide de población":
        "Gráfico de barras doble que muestra cuánta gente hay en cada grupo de edad, de cinco en cinco años, separando hombres y mujeres.",
      "desierto demográfico": "Región casi sin habitantes por su clima o su relieve.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-pob-shibuya.jpg",
        title: "Dinámica poblacional",
        info: "El cruce de Shibuya, en Tokio, octubre de 2023. Foto de Wikimedia Commons, CC BY 2.0.",
      },
      {
        image: "/kit/histok/images/s2-pob-hollerith.jpg",
        title: "Contar a la gente",
        info: "Réplica de la tabuladora de Hollerith, la máquina que procesó el censo de EE. UU. de 1890, en el Museo de Historia de la Computación. Foto de Wikimedia Commons, CC0.",
        body: [
          "La ",
          { term: "demografía" },
          " mide a la población con seis indicadores: ",
          { term: "natalidad" },
          ", ",
          { term: "fecundidad" },
          ", ",
          { term: "mortalidad" },
          ", ",
          { term: "densidad" },
          ", ",
          { term: "crecimiento natural" },
          " y ",
          { term: "crecimiento real" },
          ". Tocá cada uno para ver qué mide.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-poblacion-mundial.svg",
        title: "¿Cuántos somos?",
        diagram: true,
        info: "Gráfico de la población mundial de 1750 a 2050, con los datos del curso.",
        body: [
          "En 1804 llegamos a los primeros mil millones; en 2015 éramos 7345 millones y para 2050 se esperan 9600. La razón: mejor alimentación, sanidad e higiene, avances médicos y tecnología.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-piramides.svg",
        title: "Pirámides de población",
        diagram: true,
        info: "Las tres formas típicas de una pirámide de población.",
        body: [
          "Toda ",
          { term: "pirámide de población" },
          " tiene base (0–14 años), tronco (15–64) y cúspide (65 o más). Por su forma se reconocen tres tipos: triangular, de población joven; ojiva o campana, de población adulta; y bulbo, de población envejecida.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-transicion.svg",
        title: "La transición demográfica",
        diagram: true,
        info: "Modelo de la transición demográfica en cinco fases, con las curvas de natalidad, mortalidad y población.",
        body: [
          "1: natalidad y mortalidad altas, crecimiento lento. 2: baja la mortalidad y el crecimiento se acelera. 3: baja la natalidad y se frena. 4: las dos bajas, crecimiento mínimo. 5: envejecimiento, más muertes que nacimientos. En los países desarrollados la mortalidad bajó desde el siglo XVII y la natalidad desde mediados del XIX.",
        ],
      },
      {
        image: "/kit/histok/images/s2-pob-luces.jpg",
        title: "Dónde vivimos amontonados",
        info: "Las luces de las ciudades del mundo vistas por satélite, compuesto de datos de 1994 y 1995. Imagen de la NASA, dominio público.",
        body: [
          "Asia oriental y meridional, el «hormiguero humano»: India, China y Japón, unos 2800 millones de personas. Europa, con más del 10 % de la población mundial. Norteamérica, en sus costas y los Grandes Lagos. Y el golfo de Guinea, el valle del Nilo, Ciudad de México, Indonesia y la costa atlántica de Brasil.",
        ],
      },
      {
        image: "/kit/histok/images/s2-pob-atacama.jpg",
        title: "Los lugares vacíos",
        info: "El desierto de Atacama, en Chile, julio de 2019. Foto del Observatorio Europeo Austral (ESO), CC BY 4.0.",
        body: [
          "Cada ",
          { term: "desierto demográfico" },
          " tiene su razón. El frío: el Ártico y la Antártida. El calor y la sequía: el Sahara, el Gobi, Arabia y Atacama. La humedad de las grandes selvas tropicales. Y la altura de las montañas.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-urbano.svg",
        title: "¿Ciudad o campo?",
        diagram: true,
        info: "Porcentaje de población urbana por región del mundo, con los datos del curso (2015).",
        body: [
          "De 7345 millones de personas, las regiones más urbanas son Norteamérica (82 %) y América Latina y el Caribe (80 %). Las más rurales: el sur de Asia, donde el 67 % vive en el campo, y el África subsahariana, con el 62 %.",
        ],
      },
    ],
  },
  {
    slug: "desarrollo-poblacion",
    label: "Población: dos realidades",
    thumbnail: "/kit/histok/images/s2-pob-sapporo.jpg",
    glossary: {
      "nivel de reemplazo":
        "Los hijos por mujer que hacen falta para que una población no disminuya: unos 2,1.",
      "esperanza de vida": "Los años que, en promedio, se espera que viva una persona al nacer.",
      "saldo migratorio": "La diferencia entre las personas que llegan a vivir a un país y las que se van.",
    },
    slides: [
      {
        image: "/kit/histok/images/s2-pob-sapporo.jpg",
        title: "Población: dos realidades",
        info: "Una mujer mayor camina por una calle de Sapporo, Japón, mayo de 2019. Foto de Wikimedia Commons, CC BY-SA 2.0.",
      },
      {
        image: "/kit/histok/images/s2-pob-guatemala.jpg",
        title: "Desarrollados y en desarrollo",
        info: "El mercado de Chichicastenango, Guatemala, marzo de 2020. Foto de Wikimedia Commons, CC BY-SA 2.0.",
        body: [
          "Los países desarrollados llegaron a la fase 4 a mediados del siglo XX; su ",
          { term: "esperanza de vida" },
          " subió de 61 a 79 años y tienen 1,69 hijos por mujer, por debajo del ",
          { term: "nivel de reemplazo" },
          ": envejecen, como Japón, Italia y Alemania. Los países en desarrollo controlan el hambre y las enfermedades desde 1950, pasaron de vivir 41 años a 70, y aunque su fecundidad baja, sigue siendo la más alta.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-2050.svg",
        title: "Hacia 2050",
        diagram: true,
        info: "Crecimiento de la población por región entre 2015 y 2050, en millones, con los datos del curso.",
        body: [
          "Cada año somos 82 millones más: 54 % en Asia y 33 % en África. India y China sumarán el 37 % del planeta; en 2050 India tendrá unos 1824 millones (ya pasó a China en 2023). Las personas de 60 años o más pasarán de 901 millones en 2015 a 2100 millones en 2050.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-finlandia-nicaragua.svg",
        title: "Finlandia y Nicaragua",
        diagram: true,
        info: "Indicadores demográficos de Finlandia y Nicaragua en 2015, según el libro del curso.",
        body: [
          "Finlandia terminó su transición en los 70: población envejecida, crecimiento bajo el 1 %, un ",
          { term: "saldo migratorio" },
          " negativo entre 1950 y 1970 y, según la ONU, en descenso desde 2025. Nicaragua triplicó su población entre 1961 y 2015 y está saliendo de la primera fase; entre 1,5 y 2 millones de nicaragüenses viven fuera, en EE. UU. y Costa Rica, por el conflicto de los 80 y la economía frágil.",
        ],
      },
      {
        image: "/kit/histok/images/s2-dia-japon-bolivia.svg",
        title: "Japón y Bolivia",
        diagram: true,
        info: "Indicadores demográficos de Japón y Bolivia en 2015, según el libro del curso.",
        body: [
          "Japón perdió más de un millón de habitantes en cinco años, con poca natalidad y pocos inmigrantes: está en la quinta fase. Para 2060 tendría 87 millones, casi el 40 % con 65 años o más. Bolivia está en transición, con la densidad más baja del continente; su crecimiento bajaría de 1,53 % a 0,8 % en 2050, y la migración perdería relevancia.",
        ],
      },
    ],
  },
];

// 2 Semestre › Biología. Prueba final semestral (24 de noviembre), prof.
// Daniel Quesada. En el orden del temario: origen de la vida, teorías y
// evidencias de la evolución, la genética (que ya vive en Biología I y se
// reusa tal cual), especiación, y variabilidad, flujo y deriva.
const origenVida: Topic = {
  slug: "origen-vida",
  label: "El origen de la vida",
  thumbnail: "/kit/histok/images/b2-estromatolitos.jpg",
  glossary: {
    "evolución biológica":
      "Cambio en las características heredables de las poblaciones a lo largo de muchas generaciones; explica la diversidad de los seres vivos.",
    creacionismo: "Explicación religiosa: un ser superior creó la vida tal como es.",
    "generación espontánea":
      "Idea de que la vida puede surgir sola de la materia sin vida, como gusanos de la carne o ratones de trapos sucios.",
    biogénesis: "Principio de que todo ser vivo proviene de otro ser vivo.",
    panspermia: "Hipótesis de que la vida llegó a la Tierra desde el espacio, por ejemplo en meteoritos.",
    "atmósfera reductora":
      "Atmósfera sin oxígeno libre, rica en gases como metano, amoníaco e hidrógeno.",
    coacervados:
      "Gotitas de moléculas orgánicas rodeadas por una capa, que se separan del agua: un modelo de cómo pudo empezar la célula.",
    aminoácidos: "Las piezas con que se arman las proteínas.",
  },
  slides: [
    {
      image: "/kit/histok/images/b2-estromatolitos.jpg",
      title: "El origen de la vida",
      info: "Estromatolitos vivos en Hamelin Pool, bahía Shark, Australia: rocas formadas por bacterias, iguales a las que dejaron los rastros de vida más antiguos de la Tierra. Foto de 2005, CC BY-SA 4.0.",
    },
    {
      image: "/kit/histok/images/b2-dia-dos-preguntas.svg",
      title: "Dos preguntas distintas",
      diagram: true,
      info: "Esquema: el origen de la vida va de la materia sin vida a la primera célula; la evolución, de esa célula a la diversidad de hoy.",
      body: [
        "El examen pide separarlas. Cómo apareció el primer ser vivo es una pregunta; la otra es la ",
        { term: "evolución biológica" },
        ": una vez que hubo vida, cómo llegó a ser tan diversa. Darwin respondió la segunda, no la primera.",
      ],
    },
    {
      image: "/kit/histok/images/b2-aristoteles.jpg",
      title: "Las primeras ideas",
      info: "Busto de Aristóteles, copia romana en mármol de un original griego en bronce de Lisipo. Museo Nacional Romano, Palazzo Altemps. Fotografía de dominio público.",
      body: [
        "Durante siglos hubo dos respuestas. El ",
        { term: "creacionismo" },
        ", religioso. Y la ",
        { term: "generación espontánea" },
        ", que venía de ",
        { name: "Aristóteles" },
        " y duró unos dos mil años: en el siglo XVII, Van Helmont todavía daba una receta para «fabricar» ratones con trapos sucios y granos de trigo.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-redi-pasteur.svg",
      title: "Redi y Pasteur",
      diagram: true,
      info: "Esquema de los experimentos de Francesco Redi (1668) con frascos de carne y de Louis Pasteur (1862) con el matraz de cuello de cisne.",
      body: [
        { name: "Francesco Redi" },
        " (1668) puso carne en frascos: en los abiertos aparecieron gusanos; en los tapados con gasa, donde las moscas no podían poner huevos, no. ",
        { name: "Louis Pasteur" },
        " (1862) hirvió caldo en un matraz de cuello de cisne y no se pudrió, hasta que rompió el cuello. Así se impuso la ",
        { term: "biogénesis" },
        ".",
      ],
    },
    {
      image: "/kit/histok/images/b2-murchison.jpg",
      title: "La panspermia",
      info: "Fragmento del meteorito de Murchison, caído en Australia en 1969: contiene aminoácidos formados en el espacio. Museo Nacional de Historia Natural de París. Foto de 2020, CC BY 4.0.",
      body: [
        "La ",
        { term: "panspermia" },
        ", que defendió el sueco ",
        { name: "Svante Arrhenius" },
        " en 1903, mira al cielo: hay meteoritos, como el de Murchison, que traen aminoácidos. El problema: no explica cómo empezó la vida, solo la cambia de planeta.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-oparin.svg",
      title: "Oparin y Haldane",
      diagram: true,
      info: "Los cinco pasos de la hipótesis de Oparin y Haldane sobre el origen químico de la vida.",
      body: [
        { name: "Aleksandr Oparin" },
        " (1924) y ",
        { name: "J. B. S. Haldane" },
        " (1929), cada uno por su lado, propusieron que la Tierra joven tenía una ",
        { term: "atmósfera reductora" },
        ". Con la energía de rayos, luz ultravioleta y volcanes se formaron moléculas orgánicas que se juntaron en el mar —la sopa primitiva— hasta formar ",
        { term: "coacervados" },
        ". Es la teoría quimiosintética.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-miller.svg",
      title: "El experimento de Miller y Urey",
      diagram: true,
      info: "Esquema del aparato de Miller y Urey (1953): agua hirviendo, una mezcla de gases, chispas eléctricas, un condensador y una trampa donde se acumulan los productos.",
      body: [
        "En 1953, ",
        { name: "Stanley Miller" },
        " y ",
        { name: "Harold Urey" },
        " pusieron a prueba a Oparin: encerraron agua y los gases de la atmósfera primitiva, los calentaron y les dieron chispas como si fueran rayos. En una semana, el agua tenía ",
        { term: "aminoácidos" },
        ".",
      ],
    },
    {
      image: "/kit/histok/images/b2-miller.jpg",
      title: "Lo que demostró",
      info: "Stanley Miller junto a un aparato de vidrio como el de su experimento. Fotografía de dominio público.",
      body: [
        "Que las moléculas de la vida se pueden formar sin vida, en las condiciones de la Tierra primitiva: el primer apoyo experimental a Oparin y Haldane. Lo que no hizo: crear vida. Y hoy se cree que aquella atmósfera no era tan rica en metano y amoníaco como suponían.",
      ],
    },
  ],
};

const teoriasEvolucion: Topic = {
  slug: "teorias-evolucion",
  label: "Teorías de la evolución",
  thumbnail: "/kit/histok/images/b2-finches.jpg",
  glossary: {
    "uso y desuso":
      "Primera ley de Lamarck: un órgano que se usa mucho se desarrolla, y uno que no se usa se atrofia.",
    "caracteres adquiridos":
      "Rasgos que un individuo gana durante su vida, como un músculo entrenado; Lamarck creía que se heredaban.",
    "selección natural":
      "Proceso por el que los individuos mejor adaptados a su ambiente sobreviven y se reproducen más, y pasan sus rasgos a la siguiente generación.",
    mutacionismo:
      "Teoría de Hugo de Vries: las especies nuevas aparecen de golpe, por mutaciones grandes que se heredan.",
    "teoría sintética":
      "La teoría actual de la evolución: une la selección natural de Darwin con la genética de Mendel y las mutaciones.",
  },
  slides: [
    {
      image: "/kit/histok/images/b2-finches.jpg",
      title: "Teorías de la evolución",
      info: "Los pinzones de Galápagos, ilustrados por John Gould para el diario de viaje de Darwin (1845): picos distintos para comidas distintas. Dominio público.",
    },
    {
      image: "/kit/histok/images/b2-lamarck.jpg",
      title: "Lamarck, 1809",
      info: "Jean-Baptiste de Lamarck. Fotograbado a partir de un retrato de C. Thévenin. Wellcome Collection, CC BY 4.0.",
      body: [
        { name: "Jean-Baptiste de Lamarck" },
        " fue el primero en proponer una teoría completa de la evolución, en 1809. Dos leyes: el ",
        { term: "uso y desuso" },
        ", y la herencia de los ",
        { term: "caracteres adquiridos" },
        ". Acertó en que las especies cambian; se equivocó en cómo.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-jirafas.svg",
      title: "La jirafa, dos veces",
      diagram: true,
      info: "Esquema comparativo: cómo explican Lamarck y Darwin el cuello largo de la jirafa.",
      body: [
        "Para Lamarck, cada jirafa estiraba el cuello para alcanzar las hojas altas y sus crías nacían con el cuello un poco más largo. Para Darwin, ya había jirafas de cuello largo y corto; las de cuello largo comían mejor, vivían más y tenían más crías.",
      ],
    },
    {
      image: "/kit/histok/images/b2-darwin.jpg",
      title: "Darwin",
      info: "Charles Darwin hacia 1868, fotografiado por Julia Margaret Cameron. Dominio público.",
      body: [
        { name: "Charles Darwin" },
        " dio la vuelta al mundo en el Beagle (1831–1836); en las Galápagos vio sinsontes y tortugas distintos en cada isla. Pasó veinte años juntando pruebas, y en 1859 publicó El origen de las especies: la evolución ocurre por ",
        { term: "selección natural" },
        ".",
      ],
    },
    {
      image: "/kit/histok/images/b2-wallace.jpg",
      title: "Wallace",
      info: "Alfred Russel Wallace, en un retrato de su libro de cartas y memorias (1916). Biodiversity Heritage Library, dominio público.",
      body: [
        { name: "Alfred Russel Wallace" },
        ", estudiando animales en el archipiélago malayo, llegó solo a la misma idea y se la escribió a Darwin. En 1858 presentaron sus trabajos juntos. Por eso el temario dice «Darwin y Wallace»: la teoría tiene dos autores.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-seleccion.svg",
      title: "La selección natural, paso a paso",
      diagram: true,
      info: "Los cinco pasos de la selección natural.",
      body: [
        "Variación, sobreproducción, lucha por la existencia, supervivencia de los más aptos y herencia. Generación tras generación, los rasgos que ayudan a sobrevivir se vuelven más comunes. Ojo: «el más apto» no es el más fuerte, sino el que mejor encaja en su ambiente y más crías deja.",
      ],
    },
    {
      image: "/kit/histok/images/b2-devries.jpg",
      title: "El mutacionismo",
      info: "Hugo de Vries, botánico neerlandés, retratado por J. G. de Lint en 1925. Dominio público.",
      body: [
        { name: "Hugo de Vries" },
        ", en 1901, estudiando la planta Oenothera lamarckiana, propuso el ",
        { term: "mutacionismo" },
        ". Su aporte fue poner las mutaciones en el centro. Su error: casi todas son pequeñas, y muchas dañinas. Hoy la ",
        { term: "teoría sintética" },
        " une las ideas de Darwin con la genética.",
      ],
    },
  ],
};

const evidenciasEvolucion: Topic = {
  slug: "evidencias-evolucion",
  label: "Evidencias de la evolución",
  thumbnail: "/kit/histok/images/b2-canon.jpg",
  glossary: {
    fósil: "Resto o huella de un ser vivo que quedó conservado en la roca.",
    "forma de transición":
      "Fósil con rasgos de dos grupos distintos, que muestra el paso de uno al otro.",
    "estructuras homólogas":
      "Órganos con el mismo origen y la misma estructura interna, aunque cumplan funciones distintas.",
    "evolución divergente":
      "Cuando especies con un antepasado común se separan y adaptan a ambientes distintos.",
    "estructuras análogas":
      "Órganos que cumplen la misma función pero tienen origen y estructura distintos.",
    "evolución convergente":
      "Cuando especies sin parentesco cercano desarrollan rasgos parecidos por vivir en ambientes parecidos.",
    "estructuras vestigiales":
      "Órganos reducidos, sin función o casi, que en un antepasado sí servían.",
    "hendiduras faríngeas": "Pliegues en el cuello del embrión de todos los vertebrados.",
  },
  slides: [
    {
      image: "/kit/histok/images/b2-canon.jpg",
      title: "Evidencias de la evolución",
      info: "El Gran Cañón del Colorado desde Lipan Point, Arizona, 1998: casi dos mil millones de años de historia en capas de roca. Fotografía de dominio público.",
    },
    {
      image: "/kit/histok/images/b2-dia-estratos.svg",
      title: "El registro fósil",
      diagram: true,
      info: "Esquema de capas de roca con fósiles ordenados de más antiguo (abajo) a más reciente (arriba).",
      body: [
        "Cada ",
        { term: "fósil" },
        " está en una capa de roca, y las capas se depositan una sobre otra: las de abajo son más antiguas. Leídas en orden, cuentan la historia: primero bacterias, después invertebrados, peces, reptiles, mamíferos. Especies que ya no existen y cambios graduales.",
      ],
    },
    {
      image: "/kit/histok/images/b2-archaeopteryx.jpg",
      title: "Formas de transición",
      info: "El Archaeopteryx de Berlín, encontrado en Alemania en la década de 1870, en el Museo de Historia Natural de Berlín. Foto de 2009, CC BY-SA 3.0.",
      body: [
        "La evidencia más fuerte es una ",
        { term: "forma de transición" },
        ". El Archaeopteryx tenía plumas y alas como un ave, pero también dientes, garras en las alas y una cola de huesos como un reptil. Darwin había anunciado que tenían que aparecer fósiles intermedios; dos años después, en 1861, apareció el primer Archaeopteryx.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-homologas.svg",
      title: "Estructuras homólogas",
      diagram: true,
      info: "Las extremidades anteriores del humano, el gato, la ballena y el murciélago, con los huesos equivalentes del mismo color.",
      body: [
        "El brazo humano, la pata del gato, la aleta de la ballena y el ala del murciélago son ",
        { term: "estructuras homólogas" },
        ": tienen los mismos huesos en el mismo orden, aunque uno agarre, otro camine, otro nade y otro vuele. Señal de un antepasado común; las separó la ",
        { term: "evolución divergente" },
        ".",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-analogas.svg",
      title: "Estructuras análogas",
      diagram: true,
      info: "Dos pares de estructuras análogas: el ala del ave y la del insecto, y la forma del tiburón y la del delfín.",
      body: [
        "El ala del ave y la de una mariposa son ",
        { term: "estructuras análogas" },
        ": una tiene huesos y plumas; la otra, solo una membrana. El tiburón es un pez y el delfín un mamífero, pero los dos tienen la misma forma para nadar rápido. Es la ",
        { term: "evolución convergente" },
        ".",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-vestigiales.svg",
      title: "Estructuras vestigiales",
      diagram: true,
      info: "Seis ejemplos de estructuras vestigiales en ballenas, humanos y peces de cueva.",
      body: [
        "Las ",
        { term: "estructuras vestigiales" },
        " son pistas del pasado. La ballena conserva huesos de cadera aunque no tiene patas; nosotros, el coxis, el apéndice y las muelas del juicio. No tendrían sentido si cada especie se hubiera hecho de cero.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-embriones.svg",
      title: "Evidencia embriológica",
      diagram: true,
      info: "Esquema de embriones tempranos de pez, pollo y humano: los tres tienen hendiduras faríngeas y cola.",
      body: [
        "En sus primeras semanas, los embriones de un pez, un pollo y un humano se parecen muchísimo: todos tienen cola y ",
        { term: "hendiduras faríngeas" },
        ". Después cada uno toma su camino. Ese parecido inicial apunta a un antepasado común.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-parentesco.svg",
      title: "Leer el parentesco",
      diagram: true,
      info: "Árbol de parentesco entre pez, rana, humano, lagarto y ave, con los rasgos que comparten.",
      body: [
        "Las semejanzas sirven para ordenar: cuantas más estructuras homólogas comparten dos especies, más cerca está su antepasado común. Así se arma un árbol. Un ala de ave y una de mariposa, en cambio, no dicen nada de parentesco: son análogas.",
      ],
    },
  ],
};

const especiacion: Topic = {
  slug: "especiacion",
  label: "Especiación y aislamiento",
  thumbnail: "/kit/histok/images/b2-kaibab.jpg",
  glossary: {
    especie:
      "Concepto biológico: grupo de poblaciones que pueden cruzarse entre sí en la naturaleza y dejar descendencia fértil, y que no se cruzan con otros grupos.",
    híbrido: "Cría de dos especies distintas.",
    especiación: "Proceso por el que una especie se divide y da origen a especies nuevas.",
    alopátrica: "Especiación en la que una barrera geográfica separa a las poblaciones.",
    simpátrica: "Especiación que ocurre en el mismo territorio, sin barrera geográfica.",
    "aislamiento reproductivo":
      "Cualquier mecanismo que impide que dos especies se crucen o tengan descendencia fértil.",
    cigoto: "La primera célula de un nuevo ser, formada al unirse el óvulo y el espermatozoide.",
  },
  slides: [
    {
      image: "/kit/histok/images/b2-kaibab.jpg",
      title: "Especiación y aislamiento",
      info: "Una ardilla de Kaibab en el borde norte del Gran Cañón, 2014. El cañón la separó de la ardilla de Abert, del borde sur, y hoy son subespecies distintas: una especiación en marcha. Foto de Wikimedia Commons, CC BY 4.0.",
    },
    {
      image: "/kit/histok/images/b2-mula.jpg",
      title: "¿Qué es una especie?",
      info: "Una mula, cruce de burro y yegua, fotografiada en una granja en 2017. Foto de Wikimedia Commons, CC BY-SA 4.0.",
      body: [
        "El temario usa el concepto biológico de ",
        { term: "especie" },
        ". La prueba está en la mula: un burro y una yegua sí se cruzan, pero el ",
        { term: "híbrido" },
        " que nace es estéril. Por eso el burro y el caballo son dos especies, por más que se parezcan.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-especiacion.svg",
      title: "Cómo nace una especie",
      diagram: true,
      info: "Esquema de la especiación alopátrica (con barrera geográfica) y simpátrica (en el mismo lugar).",
      body: [
        "La ",
        { term: "especiación" },
        " puede ser ",
        { term: "alopátrica" },
        ", como las ardillas de los dos bordes del Gran Cañón, que dejaron de encontrarse y ya son subespecies distintas. O ",
        { term: "simpátrica" },
        ", común en plantas, cuando un grupo cambia sus cromosomas o su conducta y deja de cruzarse con el resto.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-precigotico.svg",
      title: "Aislamiento precigótico",
      diagram: true,
      info: "Los cinco tipos de aislamiento reproductivo precigótico.",
      body: [
        "Hay dos grandes familias de ",
        { term: "aislamiento reproductivo" },
        ". La primera actúa antes de que exista el ",
        { term: "cigoto" },
        ", y tiene cinco tipos: ecológico, temporal, etológico, mecánico y gamético. Ejemplo temporal: dos especies de ranas que se reproducen en meses distintos nunca coinciden.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-poscigotico.svg",
      title: "Aislamiento poscigótico",
      diagram: true,
      info: "Los tres tipos de aislamiento reproductivo poscigótico.",
      body: [
        "Cuando el cruce sí ocurre, todavía puede fallar después: el híbrido muere joven (inviabilidad), vive pero es estéril como la mula (esterilidad), o es fértil pero sus hijos ya no (degradación). En los tres casos, los genes de las dos especies no se mezclan.",
      ],
    },
  ],
};

const variabilidadDeriva: Topic = {
  slug: "variabilidad-deriva",
  label: "Variabilidad, flujo y deriva",
  thumbnail: "/kit/histok/images/b2-dia-portada-variabilidad.svg",
  glossary: {
    "variabilidad genética":
      "Las diferencias en los genes entre los individuos de una población.",
    meiosis: "División celular que forma los gametos, con la mitad de los cromosomas.",
    "frecuencia alélica":
      "Qué tan común es un alelo en una población, como porcentaje de todas las copias de ese gen.",
    "flujo génico":
      "Paso de alelos de una población a otra cuando individuos o gametos migran y se reproducen allí.",
    "deriva genética":
      "Cambio de las frecuencias alélicas por puro azar, no por adaptación; pesa más en poblaciones pequeñas.",
    "cuello de botella":
      "Caída brusca del tamaño de una población que deja a pocos sobrevivientes y poca variedad genética.",
    "efecto fundador":
      "Cuando unos pocos individuos fundan una población nueva, que solo tiene la parte de los alelos que ellos traían.",
  },
  slides: [
    {
      image: "/kit/histok/images/b2-dia-portada-variabilidad.svg",
      title: "Variabilidad, flujo y deriva",
      diagram: true,
      info: "Portada: una población de individuos distintos.",
    },
    {
      image: "/kit/histok/images/b2-dia-recombinacion.svg",
      title: "De dónde sale la variabilidad",
      diagram: true,
      info: "Esquema del entrecruzamiento entre cromosomas homólogos y las tres fuentes de recombinación.",
      body: [
        "La ",
        { term: "variabilidad genética" },
        " tiene dos fuentes. Las mutaciones crean alelos nuevos. La recombinación los baraja: el entrecruzamiento y el reparto al azar de los cromosomas en la ",
        { term: "meiosis" },
        ", y la fecundación entre cualquier óvulo y cualquier espermatozoide. Sin variabilidad, la selección natural no tendría nada que elegir.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-flujo.svg",
      title: "Flujo génico",
      diagram: true,
      info: "Esquema del flujo génico: individuos que migran llevan sus alelos de una población a otra.",
      body: [
        "La evolución se mide en la ",
        { term: "frecuencia alélica" },
        ": cuando cambia, la población evolucionó. El ",
        { term: "flujo génico" },
        " mueve esas frecuencias con la migración, como el polen que el viento lleva a otro valle, y hace que las poblaciones se parezcan más.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-deriva.svg",
      title: "Deriva genética",
      diagram: true,
      info: "Esquema de la deriva: en cuatro generaciones, por azar, un alelo pasa del 50 % al 100 % y el otro desaparece.",
      body: [
        "La ",
        { term: "deriva genética" },
        " es como sacar canicas a ciegas: en una bolsa con pocas, por suerte puede salir solo un color. Así un alelo puede fijarse, o perderse aunque fuera útil. Por eso hace a las poblaciones más distintas entre sí.",
      ],
    },
    {
      image: "/kit/histok/images/b2-elefante-marino.jpg",
      title: "El cuello de botella",
      info: "Un elefante marino del norte, macho joven. Foto de Grendelkhan, Wikimedia Commons, CC BY-SA 4.0.",
      body: [
        "Un ",
        { term: "cuello de botella" },
        " es deriva a lo grande. El elefante marino del norte fue cazado hasta casi desaparecer a fines del siglo XIX: quedaron unas decenas. Hoy son más de cien mil, pero casi idénticos en sus genes, porque todos vienen de aquellos pocos.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-fundador.svg",
      title: "Efecto fundador",
      diagram: true,
      info: "Esquema del efecto fundador: tres individuos colonizan una isla y un alelo raro se vuelve común.",
      body: [
        "Con el ",
        { term: "efecto fundador" },
        ", un alelo raro puede volverse común. Ejemplo clásico: los amish de Pensilvania descienden de unos pocos colonos, y entre ellos es muchísimo más frecuente un síndrome con dedos de más (Ellis-van Creveld) que en el resto del mundo.",
      ],
    },
    {
      image: "/kit/histok/images/b2-dia-flujo-vs-deriva.svg",
      title: "Flujo vs. deriva",
      diagram: true,
      info: "Tabla comparativa entre el flujo génico y la deriva genética.",
      body: [
        "Para diferenciarlos: el flujo lo causa la migración y vuelve parecidas a las poblaciones; la deriva la causa el azar y las vuelve distintas. El flujo pesa más donde hay conexión; la deriva, donde hay pocos individuos.",
      ],
    },
  ],
};

const biologia2S: Topic[] = [
  origenVida,
  teoriasEvolucion,
  evidenciasEvolucion,
  // La genética del temario es la de Biología I, sin cambios.
  deBiologiaI("adn-replicacion"),
  deBiologiaI("arn-expresion"),
  deBiologiaI("mutaciones"),
  deBiologiaI("cromosomas-herencia"),
  deBiologiaI("mendel-herencia"),
  especiacion,
  variabilidadDeriva,
];


export const semestres: Semestre[] = [
  {
    slug: "1-semestre",
    label: "1 Semestre",
    materias: [
      { slug: "sociales-i", label: "Sociales I", accent: "#8a4a4a", topics: socialesI },
      { slug: "civica-ii", label: "Cívica II", accent: "#b58a2e", topics: civicaII },
      { slug: "biologia-i", label: "Biología I", accent: "#3f5c8a", topics: biologiaI },
    ],
  },
  {
    slug: "2-semestre",
    label: "2 Semestre",
    materias: [
      { slug: "sociales-ii", label: "Sociales II", accent: "#3f6b5e", topics: socialesII },
      { slug: "sociales-2s", label: "Sociales", accent: "#6e4d88", topics: sociales2S },
      { slug: "biologia-2s", label: "Biología", accent: "#2b7370", topics: biologia2S },
    ],
  },
];

/** Todas las materias de todos los semestres, en orden. */
export const materias: Materia[] = semestres.flatMap((s) => s.materias);

// Every topic exactly once (image warming, deep links, static params). A
// section shared by two materias would otherwise appear twice — and two equal
// slugs break generateStaticParams.
export const topics: Topic[] = [
  ...new Map(materias.flatMap((m) => m.topics).map((t) => [t.slug, t])).values(),
];

export function getTopic(slug: string) {
  return topics.find((t) => t.slug === slug);
}
