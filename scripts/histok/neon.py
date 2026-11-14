"""Primitivas del lenguaje visual neón de los diagramas dibujados.

Mismo vocabulario que los SVG de Biología I: lienzo 1000×1450, fondo azul
noche, tarjetas #0d1734 con borde de 3 px y brillo, texto blanco frío y gris
azulado, flechas blancas. El dibujo importante va arriba (y < ~880): en el
teléfono el texto de la diapositiva tapa la parte de abajo.

    from neon import Svg, C
    s = Svg("Título", "subtítulo")
    s.card(60, 250, 880, 150, "green")
    s.save("public/kit/histok/images/x.svg")
"""

from xml.sax.saxutils import escape

W, H = 1000, 1450
BG = "#070d24"
CARD = "#0d1734"
WHITE = "#e8f0ff"
MUTED = "#8fa3cc"
DIM = "#2a3966"
FONT = "ui-sans-serif,system-ui,-apple-system,Helvetica,Arial,sans-serif"
C = {
    "cyan": "#35e6ff",
    "pink": "#ff53c8",
    "green": "#66ffa6",
    "yellow": "#ffd84d",
    "orange": "#ff8a3d",
}
_GLOW = {name: f"g{i}" for i, name in enumerate(C)}


def col(c):
    """Acepta un nombre de la paleta o un color literal."""
    return C.get(c, c)


class Svg:
    def __init__(self, title, subtitle=None, desc=None):
        self.title = title
        self.desc = desc or title
        self.el = [f'<rect width="{W}" height="{H}" fill="{BG}"/>']
        self.text(500, 92, title, 46, WHITE, weight=600)
        if subtitle:
            self.text(500, 140, subtitle, 27, MUTED)

    # --- texto ---------------------------------------------------------------
    def text(self, x, y, s, size=27, fill=WHITE, anchor="middle", weight=500, italic=False):
        style = ' font-style="italic"' if italic else ""
        self.el.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FONT}" font-size="{size}" '
            f'fill="{col(fill)}" text-anchor="{anchor}" font-weight="{weight}"{style}>'
            f"{escape(str(s))}</text>"
        )

    def lines(self, x, y, rows, size=23, fill=MUTED, anchor="start", weight=500, gap=None):
        """Varias líneas, una debajo de otra."""
        gap = gap or size * 1.32
        for i, r in enumerate(rows):
            self.text(x, y + i * gap, r, size, fill, anchor, weight)

    # --- formas --------------------------------------------------------------
    def _glow(self, color, glow):
        return f' filter="url(#{_GLOW[color]})"' if glow and color in _GLOW else ""

    def card(self, x, y, w, h, color="cyan", rx=20, fill=CARD, sw=3, glow=True):
        self.el.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{fill}" stroke="{col(color)}" stroke-width="{sw}"{self._glow(color, glow)}/>'
        )

    def rect(self, x, y, w, h, fill, rx=0, opacity=1, stroke=None, sw=2):
        st = f' stroke="{col(stroke)}" stroke-width="{sw}"' if stroke else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        self.el.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{col(fill)}"{st}{op}/>'
        )

    def line(self, x1, y1, x2, y2, color=WHITE, w=5, glow=False, dash=None, cap="round", opacity=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        self.el.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{col(color)}" '
            f'stroke-width="{w}" stroke-linecap="{cap}"{d}{op}{self._glow(color, glow)}/>'
        )

    def arrow(self, x1, y1, x2, y2, color=WHITE, w=5, head=24, glow=False):
        import math

        a = math.atan2(y2 - y1, x2 - x1)
        bx, by = x2 - head * math.cos(a), y2 - head * math.sin(a)
        self.line(x1, y1, bx, by, color, w, glow)
        px, py = math.sin(a) * head * 0.5, -math.cos(a) * head * 0.5
        self.poly([(x2, y2), (bx + px, by + py), (bx - px, by - py)], fill=color)

    def circle(self, cx, cy, r, stroke=None, fill="none", w=3, glow=False, opacity=1):
        st = f' stroke="{col(stroke)}" stroke-width="{w}"' if stroke else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        g = self._glow(stroke or fill, glow)
        self.el.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{col(fill)}"{st}{op}{g}/>'
        )

    def ellipse(self, cx, cy, rx, ry, stroke=None, fill="none", w=3, glow=False, opacity=1):
        st = f' stroke="{col(stroke)}" stroke-width="{w}"' if stroke else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        g = self._glow(stroke or fill, glow)
        self.el.append(
            f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" '
            f'fill="{col(fill)}"{st}{op}{g}/>'
        )

    def path(self, d, stroke=WHITE, w=4, fill="none", glow=False, opacity=1, dash=None):
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        da = f' stroke-dasharray="{dash}"' if dash else ""
        st = f' stroke="{col(stroke)}" stroke-width="{w}"' if stroke else ""
        g = self._glow(stroke if stroke else fill, glow)
        self.el.append(
            f'<path d="{d}" fill="{col(fill)}"{st} stroke-linecap="round" '
            f'stroke-linejoin="round"{op}{da}{g}/>'
        )

    def poly(self, pts, fill="none", stroke=None, w=3, glow=False, opacity=1):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        st = f' stroke="{col(stroke)}" stroke-width="{w}" stroke-linejoin="round"' if stroke else ""
        op = f' opacity="{opacity}"' if opacity != 1 else ""
        g = self._glow(stroke or fill, glow)
        self.el.append(f'<polygon points="{p}" fill="{col(fill)}"{st}{op}{g}/>')

    # --- piezas compuestas -----------------------------------------------------
    def index_card(self, x, y, w, h, color, num, head, sub=None, head_size=29, sub_size=22):
        """Tarjeta con índice 01/02… a la izquierda, título y una o dos líneas."""
        self.card(x, y, w, h, color)
        self.text(x + 34, y + h / 2 + 12, num, 34, color, "start", 700)
        tx = x + 108
        if sub:
            subs = sub if isinstance(sub, (list, tuple)) else [sub]
            top = y + h / 2 - (len(subs) * sub_size * 1.3) / 2 - 2
            self.text(tx, top + 6, head, head_size, color, "start", 700)
            self.lines(tx, top + 6 + sub_size * 1.55, subs, sub_size, MUTED)
        else:
            self.text(tx, y + h / 2 + 10, head, head_size, color, "start", 700)

    def check(self, x, y, color="green", s=1):
        self.path(f"M{x-14*s},{y} L{x-4*s},{y+11*s} L{x+16*s},{y-12*s}", color, 6 * s)

    def cross(self, x, y, color="pink", s=1):
        self.line(x - 13 * s, y - 13 * s, x + 13 * s, y + 13 * s, color, 6 * s)
        self.line(x - 13 * s, y + 13 * s, x + 13 * s, y - 13 * s, color, 6 * s)

    # --- salida ----------------------------------------------------------------
    def svg(self):
        defs = "".join(
            f'<filter id="{gid}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1600" height="2000">'
            f'<feGaussianBlur stdDeviation="7" result="b"/><feFlood flood-color="{C[name]}" flood-opacity="0.55"/>'
            f'<feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            for name, gid in _GLOW.items()
        )
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f"<title>{escape(self.desc)}</title><defs>{defs}</defs>" + "".join(self.el) + "</svg>"
        )

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.svg())
