"""Diagramas de 2 Semestre › Biología (temario final del prof. Daniel Quesada).
Correr desde la raíz del proyecto:

    python3 scripts/diagramas-biologia-2s.py
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from neon import Svg, C, BG, WHITE, MUTED, DIM, CARD  # noqa: E402

OUT = "public/kit/histok/images/"


# --- 1. Origen de la vida ------------------------------------------------------

def dos_preguntas():
    s = Svg("Dos preguntas distintas", "origen de la vida ≠ evolución", "Diferencia entre el origen de la vida y la evolución biológica")
    # materia sin vida: moléculas sueltas
    s.card(250, 190, 500, 140, "cyan")
    random.seed(4)
    for i in range(9):
        x, y = 300 + i * 50, 235 + (i % 3) * 22
        s.circle(x, y, 9, "cyan", w=3)
        s.circle(x + 16, y + 10, 6, "cyan", w=2)
    s.text(500, 315, "materia sin vida", 26, "cyan", weight=700)
    # ORIGEN
    s.arrow(500, 340, 500, 440, "yellow", 6)
    s.text(530, 384, "ORIGEN DE LA VIDA", 26, "yellow", "start", 700)
    s.text(530, 416, "¿cómo apareció el primer ser vivo?", 22, MUTED, "start")
    # primera célula
    s.card(330, 452, 340, 150, "yellow")
    s.circle(500, 512, 40, "yellow", w=4, glow=True)
    s.circle(492, 506, 11, fill="yellow")
    s.text(500, 586, "la primera célula", 25, "yellow", weight=700)
    # EVOLUCIÓN
    s.arrow(500, 612, 500, 712, "green", 6)
    s.text(530, 656, "EVOLUCIÓN BIOLÓGICA", 26, "green", "start", 700)
    s.text(530, 688, "¿cómo cambió y se diversificó?", 22, MUTED, "start")
    # árbol de la diversidad
    root = (500, 860)
    s.line(500, 730, 500, 860, "green", 5)
    ramas = [(-260, 760), (-150, 740), (-50, 770), (60, 745), (170, 765), (270, 740)]
    for dx, y in ramas:
        s.path(f"M500,850 Q{500 + dx * 0.4},{y + 60} {500 + dx},{y}", "green", 4)
        s.circle(500 + dx, y, 12, fill="green")
    s.text(500, 905, "la diversidad de hoy", 25, "green", weight=700)
    s.save(OUT + "b2-dia-dos-preguntas.svg")


def _frasco(s, x, y, tapa, color):
    """Frasco de Redi: x,y = esquina superior izquierda (160×200)."""
    s.path(f"M{x},{y} L{x},{y+190} Q{x},{y+205} {x+15},{y+205} L{x+145},{y+205} Q{x+160},{y+205} {x+160},{y+190} L{x+160},{y}",
           WHITE, 4)
    s.ellipse(x + 80, y + 175, 52, 18, fill="#ff8a3d", opacity=0.9)  # la carne
    if tapa:
        s.path(f"M{x-10},{y} L{x+170},{y}", "cyan", 6, dash="3 8")
        s.text(x + 80, y - 18, "con gasa", 22, "cyan", weight=700)
    else:
        s.text(x + 80, y - 18, "abierto", 22, MUTED, weight=700)


def redi_pasteur():
    s = Svg("Redi y Pasteur", "la vida solo viene de otra vida", "Experimentos de Redi y de Pasteur contra la generación espontánea")
    s.text(70, 220, "REDI, 1668", 28, "orange", "start", 700)
    _frasco(s, 150, 280, False, MUTED)
    _frasco(s, 560, 280, True, "cyan")
    # moscas y gusanos en el abierto
    for (fx, fy) in [(190, 322), (240, 304), (288, 328)]:
        s.ellipse(fx, fy, 9, 6, fill=WHITE)
        s.ellipse(fx - 7, fy - 6, 7, 4, stroke=WHITE, w=2)
        s.ellipse(fx + 7, fy - 6, 7, 4, stroke=WHITE, w=2)
    for k in range(4):
        gx = 195 + k * 24
        s.path(f"M{gx},{445} q6,-8 12,0 q6,8 12,0", "yellow", 4)
    s.text(230, 530, "gusanos", 25, "yellow", weight=700)
    s.check(230, 570, "yellow")
    s.text(640, 530, "sin gusanos", 25, "cyan", weight=700)
    s.cross(640, 570, "cyan")
    s.line(70, 620, 930, 620, DIM, 2)
    # Pasteur
    s.text(70, 680, "PASTEUR, 1862", 28, "green", "start", 700)
    # matraz cuello de cisne
    bx, by = 260, 830
    s.circle(bx, by, 82, WHITE, w=4)
    s.path(f"M{bx-70},{by+40} Q{bx},{by+70} {bx+70},{by+40}", None, 0, fill="#66ffa6", opacity=0.35)
    s.path(f"M{bx+25},{by-77} C{bx+40},{by-170} {bx+160},{by-160} {bx+170},{by-90} S{bx+260},{by-40} {bx+300},{by-120}",
           WHITE, 5)
    s.circle(bx + 186, by - 70, 6, fill="orange")
    s.circle(bx + 200, by - 62, 5, fill="orange")
    s.text(bx + 210, by - 20, "el polvo queda", 21, "orange", "start", 600)
    s.text(bx + 210, by + 6, "atrapado en la curva", 21, "orange", "start", 600)
    s.text(bx, by + 130, "caldo limpio", 25, "green", weight=700)
    s.text(720, 760, "si se rompe", 23, MUTED, weight=600)
    s.text(720, 790, "el cuello…", 23, MUTED, weight=600)
    s.circle(720, 860, 46, WHITE, w=4)
    for k in range(7):
        s.circle(700 + (k % 4) * 14, 850 + (k // 4) * 18, 5, fill="pink")
    s.text(720, 945, "microbios", 25, "pink", weight=700)
    s.save(OUT + "b2-dia-redi-pasteur.svg")


def oparin():
    s = Svg("Oparin y Haldane", "la sopa primitiva", "Hipótesis de Oparin y Haldane sobre el origen químico de la vida")
    pasos = [
        ("cyan", "01", "Atmósfera sin oxígeno", "metano · amoníaco · hidrógeno · vapor de agua"),
        ("yellow", "02", "Mucha energía", "rayos · luz ultravioleta · volcanes"),
        ("orange", "03", "Moléculas orgánicas", "aminoácidos y azúcares, sin ningún ser vivo"),
        ("green", "04", "La sopa primitiva", "se acumulan en los océanos"),
        ("pink", "05", "Coacervados", "gotitas con una capa: el paso a la célula"),
    ]
    y = 186
    for c, n, h, sub in pasos:
        s.index_card(60, y, 880, 124, c, n, h, sub)
        y += 124
        if n != "05":
            s.arrow(500, y + 2, 500, y + 26, WHITE, 4, 16)
        y += 30
    s.save(OUT + "b2-dia-oparin.svg")


def miller():
    s = Svg("Miller y Urey, 1953", "un rayo en un frasco", "Aparato del experimento de Miller y Urey")
    # matraz pequeño (océano) abajo a la izquierda
    ox, oy = 250, 720
    s.circle(ox, oy, 80, "cyan", w=4, glow=True)
    s.path(f"M{ox-72},{oy+30} Q{ox},{oy+62} {ox+72},{oy+30}", None, 0, fill="#35e6ff", opacity=0.4)
    for k in range(3):  # fuego
        fx = ox - 30 + k * 30
        s.path(f"M{fx},{oy+130} q-12,-24 0,-44 q12,20 0,44", "orange", 4)
    s.text(ox, oy + 172, "agua hirviendo", 24, "cyan", weight=700)
    s.text(ox, oy + 202, "= el océano", 22, MUTED)
    # tubo que sube al balón grande
    s.path(f"M{ox},{oy-80} L{ox},{360} L{560},{360}", WHITE, 6)
    # balón grande (atmósfera) arriba a la derecha
    gx, gy = 680, 380
    s.circle(gx, gy, 120, "yellow", w=4, glow=True)
    s.text(gx, gy - 12, "CH₄ · NH₃", 27, "yellow", weight=700)
    s.text(gx, gy + 24, "H₂ · H₂O", 27, "yellow", weight=700)
    s.text(gx, gy - 152, "gases = la atmósfera", 24, "yellow", weight=700)
    # electrodos y chispa
    s.line(gx - 150, gy + 70, gx - 60, gy + 70, WHITE, 5)
    s.line(gx + 150, gy + 70, gx + 60, gy + 70, WHITE, 5)
    s.path(f"M{gx-55},{gy+70} l18,-14 l10,22 l16,-20 l10,20 l18,-12 l10,14 l18,-12", "pink", 4, glow=True)
    s.text(gx - 165, gy + 128, "chispas = rayos", 23, "pink", "end", 700)
    # condensador y trampa
    s.path(f"M{gx},{gy+120} L{gx},{620}", WHITE, 6)
    s.rect(gx - 34, 560, 68, 150, CARD, rx=12, stroke="green", sw=3)
    for k in range(5):
        s.line(gx - 24, 578 + k * 28, gx + 24, 590 + k * 28, "green", 3)
    s.text(gx + 60, 618, "condensador", 23, "green", "start", 700)
    s.text(gx + 60, 646, "= la lluvia", 21, MUTED, "start")
    s.path(f"M{gx},{710} L{gx},{800} Q{gx},{850} {gx-50},{850} L{ox+120},{850} Q{ox+80},{850} {ox+60},{oy+55}", WHITE, 6)
    s.circle(gx - 120, 850, 16, fill="orange")
    s.text(gx - 120, 905, "aquí aparecieron aminoácidos", 23, "orange", weight=700)
    s.save(OUT + "b2-dia-miller.svg")


# --- 2. Teorías de la evolución -----------------------------------------------

def _jirafa(s, x, y, cuello, color, op=1):
    """Jirafa esquemática: x = centro del cuerpo, y = suelo."""
    by = y - 92
    s.ellipse(x, by, 50, 26, color, fill="none", w=4, opacity=op)
    for dx in (-34, -14, 18, 38):
        s.line(x + dx, by + 20, x + dx, y, color, 4, opacity=op)
    nx, ny = x + 40, by - 14
    hx, hy = nx + cuello * 0.32, ny - cuello
    s.line(nx, ny, hx, hy, color, 6, opacity=op)
    s.ellipse(hx + 14, hy - 4, 18, 9, color, fill="none", w=4, opacity=op)
    s.line(hx + 4, hy - 12, hx + 2, hy - 26, color, 3, opacity=op)


def jirafas():
    s = Svg("La jirafa, dos veces", "Lamarck vs. Darwin", "Cómo explican Lamarck y Darwin el cuello de la jirafa")
    # Lamarck
    s.text(70, 220, "LAMARCK", 30, "pink", "start", 700)
    s.text(70, 254, "el uso estira; el hijo hereda lo estirado", 22, MUTED, "start")
    xs = [170, 470, 770]
    for x, cu in zip(xs, [70, 120, 150]):
        _jirafa(s, x, 520, cu, "pink")
    s.arrow(245, 420, 360, 420, WHITE, 4, 18)
    s.arrow(545, 420, 660, 420, WHITE, 4, 18)
    s.text(300, 395, "se estira", 20, MUTED)
    s.text(605, 395, "lo hereda", 20, MUTED)
    s.line(70, 575, 930, 575, DIM, 2)
    # Darwin
    s.text(70, 630, "DARWIN", 30, "green", "start", 700)
    s.text(70, 664, "ya había variedad; sobreviven los de cuello largo", 22, MUTED, "start")
    for x, cu, op in [(130, 60, .35), (290, 125, 1), (450, 80, .35), (610, 130, 1)]:
        _jirafa(s, x, 950, cu, "green", op)
    s.cross(130, 990, "pink", 0.8)
    s.cross(450, 990, "pink", 0.8)
    s.arrow(700, 870, 770, 870, WHITE, 4, 18)
    _jirafa(s, 850, 950, 135, "green")
    s.text(850, 995, "su descendencia", 20, MUTED)
    s.save(OUT + "b2-dia-jirafas.svg")


def seleccion():
    s = Svg("Selección natural", "cinco pasos", "Los cinco pasos de la selección natural según Darwin")
    pasos = [
        ("cyan", "01", "Variación", "los individuos de una especie no son iguales"),
        ("yellow", "02", "Sobreproducción", "nacen más de los que pueden sobrevivir"),
        ("orange", "03", "Lucha por la existencia", "compiten por comida, pareja y espacio"),
        ("green", "04", "Sobreviven los más aptos", "los mejor adaptados se reproducen más"),
        ("pink", "05", "Herencia", "pasan sus rasgos: la población cambia"),
    ]
    y = 186
    for c, n, h, sub in pasos:
        s.index_card(60, y, 880, 124, c, n, h, sub)
        y += 124
        if n != "05":
            s.arrow(500, y + 2, 500, y + 26, WHITE, 4, 16)
        y += 30
    s.save(OUT + "b2-dia-seleccion.svg")


# --- 3. Evidencias -------------------------------------------------------------

def _hueso(s, a, b, color, w=11):
    s.line(a[0], a[1], b[0], b[1], color, w)


def _extremidad(s, ox, oy, pts, nombre, uso, sc=0.72, extra=None):
    """pts: hombro, codo, muñeca y lista de puntas de dedo (relativos)."""
    P = lambda p: (ox + p[0] * sc, oy + p[1] * sc)
    hombro, codo, muneca, dedos = (P(pts[0]), P(pts[1]), P(pts[2]), [P(d) for d in pts[3]])
    if extra:
        extra(s, P)
    _hueso(s, hombro, codo, "cyan", 13)
    # radio y cúbito: dos líneas paralelas
    dx, dy = muneca[0] - codo[0], muneca[1] - codo[1]
    n = math.hypot(dx, dy) or 1
    px, py = -dy / n * 7, dx / n * 7
    _hueso(s, (codo[0] + px, codo[1] + py), (muneca[0] + px, muneca[1] + py), "pink", 7)
    _hueso(s, (codo[0] - px, codo[1] - py), (muneca[0] - px, muneca[1] - py), "pink", 7)
    s.circle(muneca[0], muneca[1], 11, fill="yellow")
    for d in dedos:
        _hueso(s, muneca, d, "green", 6)
    s.text(ox, oy - 34, nombre, 27, WHITE, weight=700)
    s.text(ox, oy - 6, uso, 21, MUTED)


def homologas():
    s = Svg("Estructuras homólogas", "mismos huesos, distinto uso", "Extremidades anteriores homólogas de humano, gato, ballena y murciélago")
    ley = [("húmero", "cyan"), ("radio y cúbito", "pink"), ("carpos", "yellow"), ("dedos", "green")]
    x = 80
    for t, c in ley:
        s.rect(x, 186, 28, 14, c, rx=7)
        s.text(x + 38, 200, t, 21, c, "start", 700)
        x += 38 + len(t) * 12 + 40
    # humano: brazo que cuelga, mano abierta
    _extremidad(s, 260, 280, [(0, 20), (0, 150), (0, 255), [(-34, 330), (-14, 345), (4, 348), (22, 342), (40, 300)]],
                "humano", "agarrar")
    # gato: pata que se apoya hacia adelante
    _extremidad(s, 720, 280, [(-30, 20), (20, 140), (0, 250), [(30, 290), (40, 296), (50, 290), (58, 282)]],
                "gato", "caminar")

    def aleta(s, P):
        a = [P((-20, 130)), P((60, 140)), P((90, 300)), P((40, 345)), P((-40, 300))]
        s.path("M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in a) + " Z", "cyan", 3, fill="#35e6ff", opacity=0.18)

    _extremidad(s, 260, 600, [(0, 40), (10, 100), (20, 150), [(-10, 290), (20, 325), (45, 315), (65, 280)]],
                "ballena", "nadar", extra=aleta)

    def ala(s, P):
        a = [P((0, 20)), P((-80, 200)), P((-40, 300)), P((60, 330)), P((150, 300)), P((180, 210))]
        s.path("M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in a) + " Z", "pink", 3, fill="#ff53c8", opacity=0.14)

    _extremidad(s, 720, 600, [(0, 20), (40, 90), (40, 190), [(-80, 200), (-40, 300), (60, 330), (150, 300), (180, 210)]],
                "murciélago", "volar", extra=ala)
    s.save(OUT + "b2-dia-homologas.svg")


def analogas():
    s = Svg("Estructuras análogas", "mismo uso, distinto origen", "Alas de ave y de insecto, y forma de tiburón y delfín, como estructuras análogas")
    s.text(500, 220, "ALAS PARA VOLAR", 27, "yellow", weight=700)
    # ala de ave: silueta con plumas, y los huesos del brazo en el borde
    ala = ("M110,340 L235,300 L370,292 C340,318 330,330 318,338 C312,368 296,372 284,366 "
           "C276,396 258,398 248,388 C238,414 220,414 210,402 C198,424 180,424 172,410 "
           "C160,430 140,428 132,412 Z")
    s.path(ala, "cyan", 3, fill="#35e6ff", opacity=0.2)
    s.path(ala, "cyan", 3)
    for k in range(6):
        x0 = 150 + k * 36
        s.line(x0, 318 - k * 4, x0 + 22, 400 - k * 10, WHITE, 2, opacity=0.6)
    s.line(110, 340, 235, 300, "cyan", 10)
    s.line(235, 300, 330, 296, "pink", 7)
    # insecto: mariposa vista desde arriba, alas de membrana
    for sx in (-1, 1):
        sup = (f"M700,300 C{700+sx*80},220 {700+sx*165},245 {700+sx*150},320 "
               f"C{700+sx*140},360 {700+sx*60},352 700,342 Z")
        inf = (f"M700,350 C{700+sx*70},355 {700+sx*120},410 {700+sx*80},445 "
               f"C{700+sx*50},470 {700+sx*10},420 700,384 Z")
        for d in (sup, inf):
            s.path(d, "yellow", 3, fill="#ffd84d", opacity=0.25)
            s.path(d, "yellow", 3)
        s.line(700, 320, 700 + sx * 120, 290, "yellow", 2, opacity=0.7)
        s.line(700, 362, 700 + sx * 80, 420, "yellow", 2, opacity=0.7)
    s.line(700, 285, 700, 440, WHITE, 8)
    s.text(230, 500, "ave", 27, WHITE, weight=700)
    s.text(230, 532, "con huesos y plumas", 21, MUTED)
    s.text(700, 500, "insecto", 27, WHITE, weight=700)
    s.text(700, 532, "membrana, sin un solo hueso", 21, MUTED)
    s.line(70, 580, 930, 580, DIM, 2)
    s.text(500, 636, "CUERPO PARA NADAR RÁPIDO", 27, "cyan", weight=700)

    def nadador(cx, cy, color, cola_vertical):
        s.path(f"M{cx-170},{cy} Q{cx-60},{cy-70} {cx+120},{cy-14} Q{cx+150},{cy} {cx+120},{cy+14} Q{cx-60},{cy+60} {cx-170},{cy} Z",
               color, 4, fill=CARD)
        s.path(f"M{cx-30},{cy-48} L{cx+10},{cy-100} L{cx+30},{cy-40}", color, 4)
        if cola_vertical:
            s.path(f"M{cx-165},{cy} L{cx-225},{cy-60} L{cx-205},{cy} L{cx-225},{cy+50} Z", color, 4)
        else:
            s.path(f"M{cx-165},{cy} L{cx-215},{cy-26} L{cx-200},{cy} L{cx-215},{cy+26} Z", color, 4)
        s.circle(cx + 85, cy - 10, 5, fill=color)

    nadador(330, 740, "cyan", True)
    s.text(300, 840, "tiburón · pez", 25, "cyan", weight=700)
    nadador(760, 740, "green", False)
    s.text(730, 840, "delfín · mamífero", 25, "green", weight=700)
    s.save(OUT + "b2-dia-analogas.svg")


def vestigiales():
    s = Svg("Estructuras vestigiales", "restos que ya casi no sirven", "Ejemplos de estructuras vestigiales")
    items = [
        ("cyan", "Pelvis de la ballena", ["huesos de cadera", "sin patas"]),
        ("pink", "Apéndice", ["resto de un ciego", "para digerir hojas"]),
        ("yellow", "Coxis", ["lo que quedó", "de la cola"]),
        ("orange", "Muelas del juicio", ["sobran en una", "mandíbula más corta"]),
        ("green", "Músculos de la oreja", ["mueven la oreja", "casi nada"]),
        ("cyan", "Ojos del pez de cueva", ["en la oscuridad", "no ven"]),
    ]
    for i, (c, h, sub) in enumerate(items):
        x = 60 + (i % 2) * 450
        y = 190 + (i // 2) * 220
        s.card(x, y, 430, 196, c)
        s.text(x + 30, y + 60, h, 27, c, "start", 700)
        s.lines(x + 30, y + 112, sub, 23, MUTED, "start", 500, 32)
    s.save(OUT + "b2-dia-vestigiales.svg")


def _embrion(s, cx, cy, color, cola=1.0):
    s.path(f"M{cx+40},{cy-110} C{cx+120},{cy-80} {cx+110},{cy+40} {cx+40},{cy+90} "
           f"C{cx},{cy+115} {cx-40},{cy+110} {cx-55},{cy+70} "
           f"C{cx-30},{cy+60} {cx-70},{cy+20} {cx-60},{cy-20} C{cx-50},{cy-90} {cx-10},{cy-125} {cx+40},{cy-110} Z",
           color, 4, fill=CARD)
    s.circle(cx - 18, cy - 60, 14, color, w=3)  # ojo
    for k in range(3):  # hendiduras faríngeas
        s.path(f"M{cx-48+k*14},{cy-12+k*18} q12,8 24,0", "pink", 4)
    s.path(f"M{cx-55},{cy+70} q-{30*cola},20 -{48*cola},-6", "yellow", 5)  # cola


def embriones():
    s = Svg("Evidencia embriológica", "al principio, todos se parecen", "Embriones tempranos de vertebrados con hendiduras faríngeas y cola")
    for i, (n, c) in enumerate([("pez", "cyan"), ("pollo", "green"), ("humano", "orange")]):
        cx = 200 + i * 300
        _embrion(s, cx, 400, c)
        s.text(cx, 590, n, 28, c, weight=700)
    s.line(110, 640, 140, 640, "pink", 6)
    s.text(155, 648, "hendiduras faríngeas", 24, "pink", "start", 700)
    s.line(560, 640, 590, 640, "yellow", 6)
    s.text(605, 648, "cola", 24, "yellow", "start", 700)
    s.card(60, 700, 880, 150, "green")
    s.lines(90, 752, ["En el pez, las hendiduras se vuelven branquias;", "en el humano, partes del oído y el cuello."], 25, WHITE, "start", 600, 36)
    s.save(OUT + "b2-dia-embriones.svg")


def estratos():
    s = Svg("El registro fósil", "más abajo = más antiguo", "Estratos de roca con fósiles ordenados por antigüedad")
    capas = [
        ("hoy", "herramientas humanas", "orange", "#3a2a1a"),
        ("hace 60 M", "mamíferos", "yellow", "#3a361a"),
        ("hace 200 M", "dinosaurios", "green", "#1f3a26"),
        ("hace 400 M", "peces", "cyan", "#1a3140"),
        ("hace 500 M", "trilobites", "pink", "#3a1f36"),
        ("hace 3500 M", "bacterias", WHITE, "#232a40"),
    ]
    y = 190
    for when, que, c, fill in capas:
        s.rect(200, y, 600, 104, fill, rx=6)
        s.line(200, y + 104, 800, y + 104, BG, 4)
        s.text(230, y + 62, que, 26, c, "start", 700)
        s.text(780, y + 62, when, 23, MUTED, "end")
        y += 108
    s.arrow(120, 200, 120, y - 20, WHITE, 5)
    s.text(120, y + 20, "más", 22, MUTED)
    s.text(120, y + 46, "antiguo", 22, MUTED)
    s.text(500, y + 44, "M = millones de años", 22, MUTED)
    s.save(OUT + "b2-dia-estratos.svg")


def parentesco():
    s = Svg("Leer el parentesco", "más rasgos en común = pariente más cercano", "Árbol de parentesco evolutivo entre cinco vertebrados")
    # Orden real: el humano (mamífero) se separa ANTES que lagarto y ave, que
    # comparten un antepasado más reciente entre sí.
    hojas = [("pez", "cyan"), ("rana", "green"), ("humano", "pink"), ("lagarto", "yellow"), ("ave", "orange")]
    top_y = 270
    xs = [170 + i * 165 for i in range(5)]
    raiz, fin = (130, 840), (xs[4], top_y)
    en = lambda t: (raiz[0] + (fin[0] - raiz[0]) * t, raiz[1] + (fin[1] - raiz[1]) * t)
    s.line(raiz[0], raiz[1], fin[0], fin[1], WHITE, 6)
    nodos = [0.1, 0.32, 0.54, 0.78]
    for (n, c), x, t in zip(hojas, xs, nodos + [1]):
        s.text(x, top_y - 22, n, 27, c, weight=700)
        if t < 1:
            nx, ny = en(t)
            s.line(nx, ny, x, top_y, WHITE, 5)
    for t, txt in [(0.21, "cuatro patas"), (0.43, "huevo con cáscara")]:
        x, y = en(t)
        s.circle(x, y, 10, fill="yellow")
        s.text(x + 22, y + 8, txt, 22, "yellow", "start", 700)
    s.text(500, 905, "El ave y el lagarto comparten más rasgos entre sí", 23, MUTED)
    s.text(500, 935, "que con el humano: su antepasado común es más reciente.", 23, MUTED)
    s.save(OUT + "b2-dia-parentesco.svg")


# --- 4. Especiación -------------------------------------------------------------

def _poblacion(s, cx, cy, colores, r=70, n=14, seed=1):
    random.seed(seed)
    s.ellipse(cx, cy, r + 26, r, DIM, w=3)
    for i in range(n):
        a, d = random.uniform(0, 2 * math.pi), random.uniform(0, 1) ** 0.5 * (r - 12)
        s.circle(cx + math.cos(a) * d * 1.3, cy + math.sin(a) * d * 0.85, 9, fill=colores[i % len(colores)])


def especiacion():
    s = Svg("Cómo nace una especie", "con barrera y sin barrera", "Especiación alopátrica y simpátrica")
    s.text(70, 220, "ALOPÁTRICA", 28, "cyan", "start", 700)
    s.text(70, 252, "una barrera geográfica las separa", 22, MUTED, "start")
    _poblacion(s, 170, 380, ["cyan"], seed=2)
    s.arrow(275, 380, 335, 380, WHITE, 4, 16)
    _poblacion(s, 470, 380, ["cyan"], seed=3)
    s.path("M470,290 q-20,45 0,90 q20,45 0,90", "yellow", 8, glow=True)
    s.text(470, 505, "un río, un cañón", 21, "yellow", weight=600)
    s.arrow(605, 380, 665, 380, WHITE, 4, 16)
    _poblacion(s, 800, 330, ["cyan"], r=46, n=7, seed=5)
    _poblacion(s, 800, 450, ["green"], r=46, n=7, seed=6)
    s.text(800, 540, "dos especies", 22, WHITE, weight=700)
    s.line(70, 590, 930, 590, DIM, 2)
    s.text(70, 650, "SIMPÁTRICA", 28, "pink", "start", 700)
    s.text(70, 682, "en el mismo lugar, sin barrera", 22, MUTED, "start")
    _poblacion(s, 250, 800, ["cyan"], r=80, n=16, seed=7)
    s.arrow(370, 800, 450, 800, WHITE, 4, 16)
    _poblacion(s, 640, 800, ["cyan", "cyan", "pink"], r=80, n=18, seed=8)
    s.text(640, 915, "un grupo cambia (cromosomas, conducta)", 21, MUTED)
    s.text(640, 945, "y deja de cruzarse con el resto", 21, MUTED)
    s.save(OUT + "b2-dia-especiacion.svg")


def precigotico():
    s = Svg("Aislamiento precigótico", "impide que se forme el cigoto", "Los cinco tipos de aislamiento reproductivo precigótico")
    pasos = [
        ("cyan", "01", "Ecológico o de hábitat", "viven en lugares distintos y no se encuentran"),
        ("green", "02", "Temporal", "se reproducen en épocas u horas distintas"),
        ("yellow", "03", "Etológico o conductual", "no reconocen el cortejo de la otra especie"),
        ("orange", "04", "Mecánico", "los órganos reproductores no encajan"),
        ("pink", "05", "Gamético", "el espermatozoide no reconoce al óvulo"),
    ]
    y = 186
    for c, n, h, sub in pasos:
        s.index_card(60, y, 880, 128, c, n, h, sub)
        y += 146
    s.save(OUT + "b2-dia-precigotico.svg")


def poscigotico():
    s = Svg("Aislamiento poscigótico", "hay híbrido… pero falla", "Los tres tipos de aislamiento reproductivo poscigótico")
    # especie A + especie B → híbrido
    s.circle(250, 250, 40, "cyan", w=4)
    s.text(250, 260, "A", 30, "cyan", weight=700)
    s.text(345, 262, "+", 40, WHITE, weight=700)
    s.circle(440, 250, 40, "yellow", w=4)
    s.text(440, 260, "B", 30, "yellow", weight=700)
    s.arrow(510, 250, 600, 250, WHITE, 4, 16)
    s.circle(680, 250, 46, "green", w=4, glow=True)
    s.text(680, 260, "AB", 28, "green", weight=700)
    s.text(680, 330, "híbrido", 22, MUTED)
    pasos = [
        ("pink", "01", "Inviabilidad del híbrido", "muere antes de llegar a adulto"),
        ("orange", "02", "Esterilidad del híbrido", "vive, pero no puede tener crías"),
        ("yellow", "03", "Degradación del híbrido", "la 1.ª generación es fértil; la siguiente ya no"),
    ]
    y = 380
    for c, n, h, sub in pasos:
        s.index_card(60, y, 880, 140, c, n, h, sub)
        y += 160
    s.save(OUT + "b2-dia-poscigotico.svg")


# --- 5. Variabilidad, flujo y deriva --------------------------------------------

def portada_variabilidad():
    s = Svg("Variabilidad y deriva", "cómo cambian las poblaciones", "Portada: una población de individuos distintos")
    random.seed(11)
    cols = ["cyan", "pink", "green", "yellow", "orange"]
    for i in range(70):
        x, y = random.uniform(90, 910), random.uniform(220, 900)
        s.circle(x, y, random.choice([10, 13, 16]), fill=random.choice(cols), opacity=random.choice([.6, .85, 1]))
    s.save(OUT + "b2-dia-portada-variabilidad.svg")


def recombinacion():
    s = Svg("Recombinación", "la reproducción sexual baraja alelos", "Tres fuentes de recombinación genética")
    # entrecruzamiento dibujado
    y = 230
    s.line(300, y, 700, y, "cyan", 14)
    s.line(300, y + 40, 700, y + 40, "pink", 14)
    s.arrow(500, y + 70, 500, y + 120, WHITE, 4, 16)
    y2 = y + 160
    s.line(300, y2, 520, y2, "cyan", 14)
    s.line(520, y2, 700, y2, "pink", 14)
    s.line(300, y2 + 40, 520, y2 + 40, "pink", 14)
    s.line(520, y2 + 40, 700, y2 + 40, "cyan", 14)
    s.text(500, y2 + 96, "los homólogos intercambian trozos", 22, MUTED)
    pasos = [
        ("cyan", "01", "Entrecruzamiento", "crossing-over, durante la meiosis"),
        ("yellow", "02", "Segregación independiente", "cada par se reparte al azar en los gametos"),
        ("green", "03", "Fecundación al azar", "cualquier óvulo con cualquier espermatozoide"),
    ]
    y = 520
    for c, n, h, sub in pasos:
        s.index_card(60, y, 880, 118, c, n, h, sub)
        y += 134
    s.save(OUT + "b2-dia-recombinacion.svg")


def flujo():
    s = Svg("Flujo génico", "alelos que migran", "Flujo génico entre dos poblaciones")
    _poblacion(s, 250, 330, ["cyan"], r=100, n=18, seed=21)
    _poblacion(s, 750, 330, ["yellow"], r=100, n=18, seed=22)
    s.text(250, 470, "población 1", 23, MUTED)
    s.text(750, 470, "población 2", 23, MUTED)
    s.arrow(380, 300, 620, 300, WHITE, 4, 18)
    s.circle(500, 300, 10, fill="cyan")
    s.arrow(620, 360, 380, 360, WHITE, 4, 18)
    s.circle(500, 360, 10, fill="yellow")
    s.text(500, 260, "migran", 22, MUTED)
    s.arrow(500, 510, 500, 580, WHITE, 5, 18)
    s.text(500, 625, "con el tiempo…", 23, MUTED)
    _poblacion(s, 250, 760, ["cyan", "cyan", "yellow"], r=100, n=18, seed=23)
    _poblacion(s, 750, 760, ["yellow", "yellow", "cyan"], r=100, n=18, seed=24)
    s.text(500, 905, "las dos poblaciones se parecen más", 25, "green", weight=700)
    s.save(OUT + "b2-dia-flujo.svg")


def deriva():
    s = Svg("Deriva genética", "el azar cambia las frecuencias", "Deriva genética: un alelo se fija por azar en cuatro generaciones")
    gens = [(5, "50 %"), (7, "70 %"), (9, "90 %"), (10, "100 %")]
    y = 230
    for g, (n_cyan, pct) in enumerate(gens):
        s.text(70, y + 8, f"gen. {g + 1}", 23, MUTED, "start", 600)
        for i in range(10):
            s.circle(230 + i * 52, y, 17, fill="cyan" if i < n_cyan else "yellow")
        s.text(930, y + 9, pct, 27, "cyan", "end", 700)
        if g < 3:
            s.arrow(490, y + 32, 490, y + 112, WHITE, 3, 14)
            s.text(520, y + 80, "azar", 20, MUTED, "start", 600)
        y += 150
    s.text(500, y - 40, "el alelo amarillo se perdió: nadie lo eligió", 23, "yellow", weight=600)
    s.card(60, y + 10, 880, 110, "pink")
    s.lines(90, y + 56, ["Pesa más en poblaciones pequeñas,", "y no tiene que ver con adaptarse."], 25, WHITE, "start", 600, 34)
    s.save(OUT + "b2-dia-deriva.svg")


def fundador():
    s = Svg("Efecto fundador", "pocos fundan, y no representan a todos", "Efecto fundador: un grupo pequeño coloniza un lugar nuevo")
    random.seed(31)
    cols = ["cyan", "green", "yellow", "orange", "cyan", "green"]
    _poblacion(s, 260, 380, cols, r=120, n=28, seed=31)
    s.text(260, 545, "población original", 23, MUTED)
    s.text(260, 575, "(rosado: 1 de cada 28)", 21, MUTED)
    s.circle(205, 330, 9, fill="pink")
    # tres fundadores viajan
    s.path("M380,330 Q520,220 660,330", WHITE, 4, dash="2 12")
    for k, c in enumerate(["pink", "cyan", "pink"]):
        s.circle(500 + k * 26, 255, 11, fill=c)
    s.text(530, 215, "3 fundadores", 22, WHITE, weight=700)
    s.ellipse(760, 400, 150, 100, "green", w=3)
    s.text(760, 540, "isla", 22, MUTED)
    random.seed(32)
    for i in range(18):
        a, d = random.uniform(0, 2 * math.pi), random.uniform(0, 1) ** 0.5 * 80
        s.circle(760 + math.cos(a) * d * 1.4, 400 + math.sin(a) * d * 0.9, 9, fill="pink" if i % 3 != 2 else "cyan")
    s.card(60, 640, 880, 150, "pink")
    s.lines(90, 692, ["Un alelo raro en la población original", "se vuelve común en la nueva."], 26, WHITE, "start", 600, 38)
    s.save(OUT + "b2-dia-fundador.svg")


def flujo_vs_deriva():
    s = Svg("Flujo vs. deriva", "cómo diferenciarlos", "Comparación entre flujo génico y deriva genética")
    xa, xb = 470, 760
    s.text(xa, 220, "FLUJO", 29, "cyan", weight=700)
    s.text(xb, 220, "DERIVA", 29, "yellow", weight=700)
    filas = [
        ("La causa", ["migración entre", "poblaciones"], ["el azar"]),
        ("A las poblaciones", ["las vuelve más", "parecidas"], ["las vuelve más", "distintas"]),
        ("Pesa más en", ["poblaciones", "conectadas"], ["poblaciones", "pequeñas"]),
        ("Con los alelos", ["puede traer", "alelos nuevos"], ["puede perder", "alelos, aun útiles"]),
    ]
    y = 250
    for i, (lab, a, b) in enumerate(filas):
        s.rect(50, y, 900, 140, CARD if i % 2 == 0 else "#0a1330", rx=16)
        s.text(80, y + 78, lab, 25, WHITE, "start", 700)
        s.lines(xa, y + 62, a, 23, "cyan", "middle", 600, 32)
        s.lines(xb, y + 62, b, 23, "yellow", "middle", 600, 32)
        y += 150
    s.save(OUT + "b2-dia-flujo-vs-deriva.svg")


if __name__ == "__main__":
    for f in [dos_preguntas, redi_pasteur, oparin, miller, jirafas, seleccion, homologas, analogas,
              vestigiales, embriones, estratos, parentesco, especiacion, precigotico, poscigotico,
              portada_variabilidad, recombinacion, flujo, deriva, fundador, flujo_vs_deriva]:
        f()
    print("21 diagramas de Biología")
