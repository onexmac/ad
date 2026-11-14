"""Diagramas de 2 Semestre › Sociales. Correr desde la raíz del proyecto:

    python3 scripts/diagramas-sociales-2s.py

Los datos son los de las presentaciones y el libro del curso (prof. Rudy
Pérez), no cifras actualizadas: es lo que se evalúa.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from neon import Svg, C, WHITE, MUTED, DIM, CARD  # noqa: E402

OUT = "public/kit/histok/images/"


def ciclo_deng():
    s = Svg("El ciclo de Deng", "socialismo de mercado", "Ciclo de la reforma económica de Deng Xiaoping")
    cx, cy, R = 500, 560, 285
    pasos = [
        ("cyan", "1", ["Economía", "planificada"]),
        ("green", "2", ["Mucha mano", "de obra"]),
        ("yellow", "3", ["Salarios bajos", "pero crecientes"]),
        ("orange", "4", ["Consumo", "e inversión"]),
        ("pink", "5", ["Exportaciones e", "inversión extranjera"]),
    ]
    angs = [-90 + i * 72 for i in range(5)]
    pos = [(cx + R * math.cos(math.radians(a)), cy + R * math.sin(math.radians(a))) for a in angs]
    # arcos entre pasos (el ciclo), con punta de flecha
    for i in range(5):
        a0, a1 = angs[i] + 21, angs[i] + 72 - 21
        r = R
        x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
        x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
        s.path(f"M{x0:.1f},{y0:.1f} A{r},{r} 0 0 1 {x1:.1f},{y1:.1f}", WHITE, 5, opacity=0.85)
        t = math.radians(a1)
        tx, ty = -math.sin(t), math.cos(t)  # tangente en sentido horario
        hx, hy = x1 + tx * 4, y1 + ty * 4
        s.poly([(hx + tx * 18, hy + ty * 18), (hx - ty * 11, hy + tx * 11), (hx + ty * 11, hy - tx * 11)], WHITE)
    for (c, n, rows), (x, y) in zip(pasos, pos):
        w, h = 270, 112
        s.card(x - w / 2, y - h / 2, w, h, c)
        s.text(x - w / 2 + 26, y + 12, n, 36, c, "start", 700)
        s.lines(x - w / 2 + 66, y - 6, rows, 24, WHITE, "start", 600, 30)
    s.text(cx, cy - 10, "y vuelve", 26, MUTED)
    s.text(cx, cy + 24, "a empezar", 26, MUTED)
    s.save(OUT + "s2-dia-ciclo-deng.svg")


def poblacion_mundial():
    s = Svg("¿Cuántos somos?", "población mundial, en miles de millones", "Crecimiento de la población mundial, 1750-2050")
    x0, x1, y0, y1 = 150, 900, 820, 230  # eje: años 1750→2050, valor 0→10
    yr = lambda a: x0 + (a - 1750) / 300 * (x1 - x0)
    vv = lambda v: y0 - v / 10 * (y0 - y1)
    for v in range(0, 11, 2):
        s.line(x0, vv(v), x1, vv(v), DIM, 2)
        s.text(x0 - 20, vv(v) + 9, v, 24, MUTED, "end")
    for a in (1800, 1900, 2000, 2050):
        s.text(yr(a), y0 + 42, a, 24, MUTED)
    serie = [(1750, 0.79), (1804, 1), (1850, 1.26), (1900, 1.65), (1927, 2), (1950, 2.5), (1960, 3),
             (1974, 4), (1987, 5), (1999, 6), (2011, 7), (2015, 7.345)]
    d = "M" + " L".join(f"{yr(a):.1f},{vv(v):.1f}" for a, v in serie)
    s.path(d, "cyan", 7, glow=True)
    s.path(f"M{yr(2015):.1f},{vv(7.345):.1f} L{yr(2050):.1f},{vv(9.6):.1f}", "yellow", 6, dash="4 14")
    for a, v in serie[1:]:
        if v == int(v) or a == 2015:
            s.circle(yr(a), vv(v), 9, fill="cyan")
    s.circle(yr(2050), vv(9.6), 11, fill="yellow")
    s.text(yr(1804) + 4, vv(1) - 30, "1804: 1000 millones", 25, "cyan", "start", 700)
    s.text(yr(2015) - 18, vv(7.345) + 6, "2015: 7345 M", 25, "cyan", "end", 700)
    s.text(yr(2050) - 6, vv(9.6) - 26, "2050: 9600 M", 25, "yellow", "end", 700)
    s.text(yr(2050) - 6, vv(9.6) + 44, "proyección", 22, MUTED, "end")
    # cada mil millones tarda menos
    s.card(170, 300, 410, 120, "green")
    s.lines(196, 348, ["Desde 1974, cada mil millones", "tarda menos de 20 años"], 25, WHITE, "start", 600, 34)
    s.save(OUT + "s2-dia-poblacion-mundial.svg")


FILA = 27  # alto de cada grupo de edad (24 de barra + 3 de aire)


def _piramide(s, cx, base_y, filas, color_h="cyan", color_m="pink"):
    """filas: anchos (0..1) de abajo (0-4 años) hacia arriba (75+)."""
    for i, w in enumerate(filas):
        y = base_y - (i + 1) * FILA
        ww = w * 120
        s.rect(cx - ww - 3, y, ww, FILA - 3, color_h, rx=4)
        s.rect(cx + 3, y, ww, FILA - 3, color_m, rx=4)


def piramides():
    s = Svg("Tres pirámides", "por edad y por sexo", "Los tres tipos de pirámide de población")
    # 16 grupos de cinco años: 0-4, 5-9 … 70-74, 75+
    tipos = [
        ("Triangular", "joven · expansiva",
         [1, .92, .84, .76, .68, .6, .53, .46, .39, .33, .27, .21, .16, .11, .07, .04]),
        ("Ojiva o campana", "adulta · estable",
         [.7, .71, .71, .71, .7, .69, .68, .66, .63, .6, .55, .49, .41, .32, .22, .13]),
        ("Bulbo", "envejecida · regresiva",
         [.4, .44, .49, .55, .62, .69, .75, .79, .81, .8, .76, .7, .61, .5, .38, .3]),
    ]
    base = 780
    for i, (n, sub, filas) in enumerate(tipos):
        cx = 258 + i * 268
        _piramide(s, cx, base, filas)
        s.text(cx, base + 52, n, 29, WHITE, weight=700)
        s.text(cx, base + 88, sub, 23, MUTED)
    s.text(70, 300, "♂ hombres", 24, "cyan", "start", 700)
    s.text(940, 300, "mujeres ♀", 24, "pink", "end", 700)
    # las tres partes, marcadas a la izquierda y alineadas con las filas
    partes = [("0–14", "base", 0, 3, "orange"), ("15–64", "tronco", 3, 13, "green"), ("65+", "cúspide", 13, 16, "yellow")]
    for edad, nombre, i0, i1, c in partes:
        ya, yb = base - i1 * FILA + 3, base - i0 * FILA - 3
        s.line(34, ya, 34, yb, c, 6)
        s.text(50, (ya + yb) / 2 - 2, nombre, 20, c, "start", 700)
        s.text(50, (ya + yb) / 2 + 22, edad, 19, MUTED, "start")
    s.save(OUT + "s2-dia-piramides.svg")


def indicadores():
    s = Svg("Los seis indicadores", "lo que mide la demografía", "Los seis indicadores de la demografía")
    tarjetas = [
        ("Natalidad", "pink", ["Nacimientos vivos al año", "por cada 1000 habitantes"]),
        ("Fecundidad", "orange", ["Nacimientos por cada 1000", "mujeres de 15 a 49 años"]),
        ("Mortalidad", "cyan", ["Defunciones al año", "por cada 1000 habitantes"]),
        ("Densidad", "yellow", ["Habitantes por km²"]),
        ("Crecimiento natural", "green", ["Nacimientos − muertes"]),
        ("Crecimiento real", "green", ["Natural + inmigrantes", "− emigrantes"]),
    ]
    # compacto y arriba: en el teléfono el texto de la diapositiva tapa la mitad de abajo
    w, h, gx, gy, y0 = 425, 132, 30, 16, 178
    for i, (nombre, c, filas) in enumerate(tarjetas):
        x = 60 + (i % 2) * (w + gx)
        y = y0 + (i // 2) * (h + gy)
        s.card(x, y, w, h, c)
        s.text(x + 28, y + 46, nombre, 29, c, "start", 700)
        s.lines(x + 28, y + 87, filas, 23, WHITE)
    s.save(OUT + "s2-dia-indicadores.svg")


def transicion():
    s = Svg("Transición demográfica", "las cinco fases", "Modelo de la transición demográfica en cinco fases")
    # nombres y resultados arriba, curvas abajo: en el teléfono el texto tapa la parte baja
    x0, x1, top, bot = 70, 930, 380, 690
    fw = (x1 - x0) / 5
    fases = ["Antiguo\nrégimen", "Comienzo de\nla transición", "Final de\nla transición", "Régimen\nmoderno", "Enveje-\ncimiento"]
    crece = [("lento", "cyan"), ("se acelera", "green"), ("ritmo lento", "yellow"), ("mínimo o nulo", "orange"), ("negativo", "pink")]
    for i, f in enumerate(fases):
        xa = x0 + i * fw
        if i:
            s.line(xa, 170, xa, bot, DIM, 2, dash="6 10")
        s.text(xa + fw / 2, 200, str(i + 1), 30, WHITE, weight=700)
        rows = f.split("\n")
        for k, row in enumerate(rows):
            s.text(xa + fw / 2, 240 + k * 26, row, 21, MUTED)
        txt, c = crece[i]
        s.text(xa + fw / 2, 316, txt, 22, c, weight=700)
    yy = lambda v: bot - v * (bot - top)  # v en 0..1
    xx = lambda f: x0 + f * (x1 - x0)
    nat = [(0, .9), (.2, .92), (.3, .9), (.42, .78), (.55, .5), (.6, .4), (.7, .3), (.8, .26), (.9, .2), (1, .18)]
    mor = [(0, .86), (.05, .9), (.1, .82), (.15, .9), (.2, .84), (.28, .62), (.36, .44), (.42, .36), (.5, .32),
           (.6, .28), (.7, .26), (.8, .26), (.88, .3), (1, .36)]
    pts = lambda serie: " L".join(f"{xx(f):.1f},{yy(v):.1f}" for f, v in serie)
    # área entre natalidad y mortalidad = crecimiento natural
    import bisect

    def interp(serie, f):
        xs = [p[0] for p in serie]
        j = max(1, min(len(serie) - 1, bisect.bisect_left(xs, f)))
        (fa, va), (fb, vb) = serie[j - 1], serie[j]
        return va + (vb - va) * (f - fa) / (fb - fa)

    fs = [i / 80 for i in range(81)]
    up = " L".join(f"{xx(f):.1f},{yy(interp(nat, f)):.1f}" for f in fs)
    dn = " L".join(f"{xx(f):.1f},{yy(interp(mor, f)):.1f}" for f in reversed(fs))
    s.path(f"M{up} L{dn} Z", None, 0, fill="#ffd84d", opacity=0.13)
    s.path("M" + pts(nat), "pink", 6, glow=True)
    s.path("M" + pts(mor), "cyan", 6, glow=True)
    # población total
    pob = [(0, .1), (.2, .12), (.3, .16), (.4, .26), (.5, .42), (.6, .55), (.7, .62), (.8, .65), (.9, .64), (1, .6)]
    s.path("M" + pts(pob), "green", 5, dash="2 12")
    # leyenda
    ly = bot + 60
    s.line(80, ly, 130, ly, "pink", 6)
    s.text(145, ly + 8, "natalidad", 23, "pink", "start", 700)
    s.line(330, ly, 380, ly, "cyan", 6)
    s.text(395, ly + 8, "mortalidad", 23, "cyan", "start", 700)
    s.line(600, ly, 650, ly, "green", 5, dash="2 12")
    s.text(665, ly + 8, "población", 23, "green", "start", 700)
    s.save(OUT + "s2-dia-transicion.svg")


def urbano():
    s = Svg("¿Ciudad o campo?", "% de la población que vive en ciudades", "Población urbana por región, 2015")
    datos = [("Norteamérica", 82), ("América Latina y el Caribe", 80), ("Europa y Asia Central", 71),
             ("Medio Oriente y norte de África", 64), ("Este de Asia y Pacífico", 57),
             ("África subsahariana", 38), ("Sur de Asia", 33)]
    x0, x1, y = 70, 930, 228
    for n, p in datos:
        c = "yellow" if n.startswith("América Latina") else "cyan"
        s.text(x0, y, n, 25, WHITE if c == "cyan" else "yellow", "start", 600)
        s.rect(x0, y + 16, x1 - x0, 30, DIM, rx=15)
        s.rect(x0, y + 16, (x1 - x0) * p / 100, 30, c, rx=15)
        s.text(x1, y, f"{p} %", 25, c, "end", 700)
        y += 92
    s.text(x0, y + 20, "■ urbano", 23, "cyan", "start", 700)
    s.text(x0 + 170, y + 20, "■ rural", 23, DIM, "start", 700)
    s.save(OUT + "s2-dia-urbano.svg")


def hacia_2050():
    s = Svg("Hacia 2050", "cuánto crece cada región, 2015–2050", "Crecimiento de la población por región, 2015-2050, en millones")
    datos = [("África", 1291, "orange"), ("Asia", 874, "yellow"), ("América Latina", 150, "green"),
             ("Norteamérica", 75, "cyan"), ("Oceanía", 17, "cyan"), ("Europa", -32, "pink")]
    zero, scale, y = 300, 560 / 1291, 240
    s.line(zero, 215, zero, 215 + len(datos) * 96 - 20, MUTED, 3)
    for n, v, c in datos:
        s.text(zero - 24, y + 38, n, 27, WHITE, "end", 600)
        w = abs(v) * scale
        x = zero if v >= 0 else zero - w
        s.rect(x, y + 10, max(w, 6), 40, c, rx=8)
        lab = f"+{v}" if v > 0 else f"−{abs(v)}"
        s.text((zero + w + 16) if v >= 0 else zero + 16, y + 40, lab, 26, c, "start", 700)
        y += 96
    s.card(70, y + 20, 860, 112, "orange")
    s.lines(100, y + 66, ["Total: +2375 millones (+33 %).", "Más de la mitad del aumento será africano."], 25, WHITE, "start", 600, 34)
    s.save(OUT + "s2-dia-2050.svg")


def _comparar(name, titulo, a, b, ca, cb, filas, etiquetas, desc):
    s = Svg(titulo, "indicadores de 2015, según el libro", desc)
    xa, xb, y = 560, 830, 240
    s.text(xa, y, a, 31, ca, weight=700)
    s.text(xb, y, b, 31, cb, weight=700)
    s.text(xa, y + 36, etiquetas[0], 20, MUTED)
    s.text(xb, y + 36, etiquetas[1], 20, MUTED)
    y += 70
    for i, (lab, va, vb) in enumerate(filas):
        if i % 2 == 0:
            s.rect(50, y + 4, 900, 66, CARD, rx=14)
        s.text(80, y + 47, lab, 25, WHITE, "start", 600)
        s.text(xa, y + 47, va, 27, ca, weight=700)
        s.text(xb, y + 47, vb, 27, cb, weight=700)
        y += 70
    s.save(OUT + name)


def comparaciones():
    _comparar(
        "s2-dia-finlandia-nicaragua.svg", "Finlandia vs. Nicaragua", "Finlandia", "Nicaragua", "cyan", "yellow",
        [("Población", "5,47 M", "6,08 M"), ("Natalidad (‰)", "10,5", "20,35"), ("Hijos por mujer", "1,71", "2,26"),
         ("Mortalidad (‰)", "9,6", "4,75"), ("Esperanza de vida", "84", "74,8"), ("Crecimiento", "0,4 %", "1,1 %"),
         ("Densidad (hab./km²)", "18", "50")],
        ("transición terminada", "terminando la fase 1"),
        "Comparación de indicadores demográficos de Finlandia y Nicaragua, 2015",
    )
    _comparar(
        "s2-dia-japon-bolivia.svg", "Japón vs. Bolivia", "Japón", "Bolivia", "pink", "green",
        [("Población", "126,96 M", "10,72 M"), ("Natalidad (‰)", "8", "24"), ("Hijos por mujer", "1,42", "2,97"),
         ("Mortalidad (‰)", "10", "7,43"), ("Esperanza de vida", "84", "68,3"), ("Crecimiento", "−0,13 %", "1,53 %"),
         ("Densidad (hab./km²)", "347", "9")],
        ("fase 5: envejecimiento", "en transición"),
        "Comparación de indicadores demográficos de Japón y Bolivia, 2015",
    )


if __name__ == "__main__":
    ciclo_deng()
    poblacion_mundial()
    indicadores()
    piramides()
    transicion()
    urbano()
    hacia_2050()
    comparaciones()
    print("9 diagramas de Sociales")
