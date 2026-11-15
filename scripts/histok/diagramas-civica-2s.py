"""Diagramas de 2 Semestre › Cívica (prueba final del 25 de noviembre).

Mismo lenguaje que los de Sociales: tarjetas neón sobre azul noche. Todo el
dibujo queda arriba (y < ~640): en el teléfono el título y el texto de la
diapositiva tapan la mitad de abajo.

    python3 scripts/histok/diagramas-civica-2s.py    (desde la raíz del repo)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from neon import Svg, WHITE, MUTED, DIM  # noqa: E402

OUT = "public/kit/histok/images/"


def pila(s, tarjetas, y=168, gap=12, x=60, w=880):
    """Tarjetas apiladas: (título, color, [líneas]). Devuelve la y final."""
    for titulo, color, filas in tarjetas:
        h = 52 + 29 * len(filas)
        s.card(x, y, w, h, color)
        s.text(x + 30, y + 40, titulo, 26, color, "start", 700)
        s.lines(x + 30, y + 74, filas, 23, WHITE, gap=29)
        y += h + gap
    return y


def rejilla(s, tarjetas, y=175, cols=2, h=128, gap=16):
    w = (880 - gap * (cols - 1)) / cols
    for i, (titulo, color, filas) in enumerate(tarjetas):
        x = 60 + (i % cols) * (w + gap)
        yy = y + (i // cols) * (h + gap)
        s.card(x, yy, w, h, color)
        s.text(x + 26, yy + 42, titulo, 26, color, "start", 700)
        s.lines(x + 26, yy + 78, filas, 21, WHITE, gap=30)


# --- Poderes ------------------------------------------------------------------

def ejecutivo():
    s = Svg("Poder Ejecutivo", "quién lo forma y qué hace", "El Poder Ejecutivo de Costa Rica")
    pila(s, [
        ("Lo forman", "cyan", ["La presidencia, dos vicepresidencias y los ministros", "(presidente + ministros = Consejo de Gobierno)"]),
        ("Cómo llegan", "yellow", ["Elección popular cada 4 años. Sin reelección", "inmediata: hay que esperar 8 años"]),
        ("Qué hace", "green", ["Gobierna y administra, ejecuta las leyes,", "dirige la política exterior y puede vetar leyes"]),
        ("Dependencias", "pink", ["Los ministerios: Educación (MEP), Salud,", "Hacienda, Seguridad Pública (Fuerza Pública)…"]),
    ])
    s.save(OUT + "civ2-dia-ejecutivo.svg")


def legislativo():
    s = Svg("Poder Legislativo", "la Asamblea Legislativa", "El Poder Legislativo de Costa Rica")
    pila(s, [
        ("Lo forman", "cyan", ["57 diputados, elegidos por provincia cada 4 años,", "sin reelección inmediata"]),
        ("Qué hace", "green", ["Hace y reforma las leyes, aprueba el presupuesto", "y los tratados, y ejerce el control político"]),
        ("Control político", "yellow", ["Interpela a los ministros y abre", "comisiones de investigación"]),
        ("Dependencias", "pink", ["Contraloría General de la República", "y Defensoría de los Habitantes"]),
    ])
    s.save(OUT + "civ2-dia-legislativo.svg")


def judicial():
    s = Svg("Poder Judicial", "la Corte Suprema de Justicia", "El Poder Judicial de Costa Rica")
    pila(s, [
        ("Lo forman", "cyan", ["22 magistrados en 4 salas: Primera, Segunda,", "Tercera y la Sala Constitucional (Sala IV)"]),
        ("Cómo llegan", "yellow", ["Los nombra la Asamblea por 8 años; siguen", "salvo que 2/3 de los diputados voten en contra"]),
        ("Qué hace", "green", ["Administra justicia: resuelve conflictos y vigila", "que leyes y actos respeten la Constitución"]),
        ("Dependencias", "pink", ["OIJ (investiga delitos), Ministerio Público", "(Fiscalía) y Defensa Pública"]),
    ])
    s.save(OUT + "civ2-dia-judicial.svg")


def incidencia():
    s = Svg("Mecanismos de incidencia", "cómo la ciudadanía mueve decisiones", "Mecanismos de incidencia ciudadana en Costa Rica")
    pila(s, [
        ("Referéndum", "cyan", ["El pueblo aprueba o rechaza una ley (TLC, 2007)"]),
        ("Iniciativa popular", "green", ["Con firmas del 5 % del padrón se presenta una ley"]),
        ("Plebiscito y cabildo", "yellow", ["Consultas y asambleas en el cantón"]),
        ("Petición y recursos", "pink", ["Pedir a cualquier institución y acudir a la Sala IV"]),
        ("Audiencias y consultas", "orange", ["Opinar antes de que se decida, p. ej. sobre tarifas"]),
    ])
    s.save(OUT + "civ2-dia-incidencia.svg")


def rendicion():
    s = Svg("Rendición de cuentas", "quién vigila al que manda", "Mecanismos de rendición de cuentas en Costa Rica")
    pila(s, [
        ("Constitución, artículo 11", "yellow", ["Todo funcionario será evaluado por sus resultados"]),
        ("Contraloría General", "cyan", ["Vigila cómo se gasta el dinero público"]),
        ("Defensoría de los Habitantes", "green", ["Defiende a las personas frente al Estado"]),
        ("Procuraduría de la Ética", "pink", ["Investiga la corrupción de funcionarios"]),
        ("Mensaje del 1 de mayo", "orange", ["La presidencia informa a la Asamblea cada año"]),
    ])
    s.save(OUT + "civ2-dia-rendicion.svg")


def municipal():
    s = Svg("Gobiernos locales", "las municipalidades", "Los gobiernos locales de Costa Rica")
    rejilla(s, [
        ("84 cantones", "cyan", ["cada uno con su", "municipalidad"]),
        ("Alcaldía", "yellow", ["la parte ejecutiva:", "administra el cantón"]),
        ("Concejo Municipal", "green", ["los regidores:", "deliberan y deciden"]),
        ("Elecciones propias", "pink", ["cada 4 años, a mitad", "del periodo nacional"]),
        ("Servicios", "orange", ["basura, calles, parques,", "permisos y patentes"]),
        ("Distritos", "cyan", ["síndicos y concejos", "de distrito"]),
    ])
    s.save(OUT + "civ2-dia-municipal.svg")


# --- Abolición, desafíos, cultura política -----------------------------------

def articulo12():
    s = Svg("Constitución, artículo 12", "1949", "El artículo 12 de la Constitución de Costa Rica")
    s.card(60, 175, 880, 250, "yellow")
    s.lines(95, 230, [
        "«Se proscribe el Ejército como institución",
        "permanente. Para la vigilancia y conservación",
        "del orden público, habrá las fuerzas de policía",
        "necesarias. […] unas y otras estarán siempre",
        "subordinadas al poder civil».",
    ], 27, WHITE, gap=40)
    pila(s, [
        ("Características", "cyan", ["Sin fuerzas armadas permanentes, desde 1948"]),
        ("Funciones", "green", ["Policías civiles, como la Fuerza Pública"]),
    ], y=445)
    s.save(OUT + "civ2-dia-articulo12.svg")


def ciudadania():
    s = Svg("Ciudadanía activa", "más que votar cada 4 años", "Qué hace una ciudadanía activa")
    rejilla(s, [
        ("Se informa", "cyan", ["contrasta fuentes", "antes de opinar"]),
        ("Participa", "green", ["vota, opina y se", "organiza"]),
        ("Vigila", "yellow", ["pide cuentas a quienes", "gobiernan"]),
        ("Denuncia", "pink", ["la corrupción y el", "abuso de poder"]),
    ], h=124)
    s.save(OUT + "civ2-dia-ciudadania.svg")


def valores():
    s = Svg("Valores democráticos", "los seis del temario", "Los valores democráticos del temario")
    rejilla(s, [
        ("Libertad", "cyan", ["pensar, decir y elegir", "sin coacción"]),
        ("Igualdad política", "yellow", ["un voto vale lo mismo", "que cualquier otro"]),
        ("Solidaridad y equidad", "green", ["apoyar a quien está", "en desventaja"]),
        ("Tolerancia y respeto", "pink", ["convivir con quien", "piensa distinto"]),
        ("Paz", "orange", ["resolver conflictos", "sin violencia"]),
        ("Honestidad", "cyan", ["actuar con la verdad,", "también en lo público"]),
    ], cols=2, h=120)
    s.save(OUT + "civ2-dia-valores.svg")


# --- Comunicación política ----------------------------------------------------

def comunicacion():
    s = Svg("Dos formas de comunicar", "lo que dicen las instituciones", "Propaganda y comunicación educativa")
    pila(s, [
        ("Propaganda", "pink", ["Busca convencer y ganar apoyo para", "una idea, un gobierno o una institución"]),
        ("Comunicación educativa", "green", ["Busca que la gente aprenda y cambie", "conductas: ahorrar, cuidarse, prevenir"]),
        ("Las dos forman opinión pública", "yellow", ["Por eso hay que leerlas con criterio:", "quién habla, qué quiere y qué calla"]),
    ])
    s.save(OUT + "civ2-dia-comunicacion.svg")


def instituciones():
    s = Svg("Cuatro instituciones", "quién es quién", "ICE, MEP, CONAVI y RECOPE")
    rejilla(s, [
        ("ICE", "cyan", ["electricidad y", "telecomunicaciones"]),
        ("MEP", "yellow", ["Ministerio de", "Educación Pública"]),
        ("CONAVI", "green", ["Consejo Nacional de", "Vialidad: carreteras"]),
        ("RECOPE", "pink", ["Refinadora Costarricense", "de Petróleo: combustibles"]),
    ], h=124)
    s.text(500, 470, "Todas comunican: informan sobre su servicio,", 24, MUTED)
    s.text(500, 504, "educan a la población y defienden su gestión.", 24, MUTED)
    s.save(OUT + "civ2-dia-instituciones.svg")


def agenda():
    s = Svg("Agenda política", "qué se discute primero", "Quién arma la agenda política")
    pila(s, [
        ("Partidos", "cyan", ["la proponen en su programa de gobierno"]),
        ("Gobierno", "yellow", ["la ejecuta y decide qué va primero"]),
        ("Medios", "green", ["eligen de qué se habla y cómo"]),
        ("Ciudadanía", "pink", ["la empuja con votos, protestas y peticiones"]),
    ])
    s.save(OUT + "civ2-dia-agenda.svg")


# --- Sistema electoral ------------------------------------------------------

def tse():
    s = Svg("Tribunal Supremo de Elecciones", "con rango de poder del Estado", "La organización del Tribunal Supremo de Elecciones")
    pila(s, [
        ("Lo forman", "cyan", ["3 magistrados (5 en año electoral), nombrados", "por la Corte Suprema por 6 años"]),
        ("Qué hace", "yellow", ["Organiza, dirige y vigila las elecciones,", "y es el juez de lo electoral"]),
        ("Registro Civil", "green", ["Nacimientos, matrimonios, defunciones,", "cédulas y el padrón electoral"]),
        ("Registro Electoral", "pink", ["Inscribe partidos y controla", "su financiamiento"]),
    ])
    s.save(OUT + "civ2-dia-tse.svg")


def como_se_elige():
    s = Svg("Cómo se elige", "elecciones nacionales", "Cómo se elige en Costa Rica")
    pila(s, [
        ("Cada 4 años, primer domingo de febrero", "cyan", ["Presidencia, vicepresidencias y 57 diputados"]),
        ("Para ganar la presidencia", "yellow", ["Más del 40 % de los votos válidos; si nadie", "llega, segunda ronda el primer domingo de abril"]),
        ("Diputados", "green", ["Por provincia, según los votos de cada partido"]),
        ("Municipales", "pink", ["En su propia elección, dos años después"]),
    ])
    s.save(OUT + "civ2-dia-como-se-elige.svg")


def abstencion():
    s = Svg("Abstencionismo", "primera ronda presidencial, % del padrón", "Abstencionismo en Costa Rica, 1998–2022")
    datos = [(1998, 30.0), (2002, 31.2), (2006, 34.8), (2010, 30.9), (2014, 31.8), (2018, 34.3), (2022, 40.3)]
    x0, y, w = 170, 190, 680
    for anio, v in datos:
        c = "pink" if anio == 2022 else "cyan"
        s.text(x0 - 22, y + 30, str(anio), 26, WHITE, "end", 600)
        s.rect(x0, y + 6, w, 34, DIM, rx=10)
        s.rect(x0, y + 6, w * v / 50, 34, c, rx=10)
        s.text(x0 + w * v / 50 + 14, y + 32, f"{v:.1f}".replace(".", ",") + " %", 24, c, "start", 700)
        y += 62
    s.text(500, y + 22, "escala hasta 50 %", 21, MUTED)
    s.save(OUT + "civ2-dia-abstencion.svg")


def partidos():
    s = Svg("De dos a muchos", "el sistema de partidos", "Del bipartidismo al multipartidismo en Costa Rica")
    pila(s, [
        ("Bipartidismo (1980s–1990s)", "cyan", ["Liberación Nacional y la Unidad Social", "Cristiana se turnaban el poder"]),
        ("2002: se rompe", "yellow", ["Surge Acción Ciudadana y hay segunda", "ronda por primera vez"]),
        ("Multipartidismo", "green", ["En 2022 hubo 25 candidaturas presidenciales"]),
        ("Deuda política", "pink", ["El Estado reembolsa gastos de campaña: hasta", "el 0,19 % del PIB, según los votos de cada partido"]),
    ])
    s.save(OUT + "civ2-dia-partidos.svg")


if __name__ == "__main__":
    for f in (ejecutivo, legislativo, judicial, incidencia, rendicion, municipal, articulo12, ciudadania,
              valores, comunicacion, instituciones, agenda, tse, como_se_elige, abstencion, partidos):
        f()
    print("16 diagramas de Cívica")
