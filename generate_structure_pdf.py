import os
from fpdf import FPDF

EXCLUDE_DIRS = {"target", "node_modules", ".git", ".next"}

def get_tree(root):
    lines = []
    root = os.path.abspath(root)
    root_name = os.path.basename(root)
    lines.append(root_name + "/")
    
    def recurse(path, prefix=""):
        try:
            entries = sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower()))
        except PermissionError:
            return
        entries = [e for e in entries if e.name not in EXCLUDE_DIRS]
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            connector = "`-- " if is_last else "|-- "
            suffix = "/" if entry.is_dir() else ""
            lines.append(prefix + connector + entry.name + suffix)
            if entry.is_dir():
                extension = "    " if is_last else "|   "
                recurse(entry.path, prefix + extension)
    
    recurse(root)
    return lines

class PDF(FPDF):
    def header(self):
        self.set_font("Courier", "B", 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 10, "Truva - Codebase File Structure", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Courier", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "Generated on April 9, 2026  |  Excludes: target, node_modules, .git, .next", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Courier", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def main():
    root = r"c:\Users\panth\Videos\truva"
    lines = get_tree(root)

    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    pdf.set_font("Courier", "", 8.5)
    pdf.set_text_color(20, 20, 20)

    for line in lines:
        # Color directories differently
        if line.rstrip().endswith("/"):
            pdf.set_text_color(30, 80, 160)
            pdf.set_font("Courier", "B", 8.5)
        else:
            pdf.set_text_color(40, 40, 40)
            pdf.set_font("Courier", "", 8.5)
        pdf.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")

    out_path = r"c:\Users\panth\Videos\truva\codebase_structure.pdf"
    pdf.output(out_path)
    print(f"PDF saved to: {out_path}")
    print(f"Total lines: {len(lines)}")

if __name__ == "__main__":
    main()
