using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class NeonPsIconMaker {
    public static Bitmap RenderIcon(int size) {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;

            float s = size / 256.0f;

            // 1. Draw Rounded Dark App Plate
            float pad = 12 * s;
            float rPlate = 50 * s;
            RectangleF plateRect = new RectangleF(pad, pad, size - 2 * pad, size - 2 * pad);
            using (GraphicsPath plate = MakeRoundedRect(plateRect, rPlate)) {
                using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(255, 12, 13, 18))) {
                    g.FillPath(bgBrush, plate);
                }

                // Ambient Glow under each quadrant
                DrawRadialGlow(g, 78 * s, 78 * s, 65 * s, Color.FromArgb(70, 255, 40, 80));   // Red
                DrawRadialGlow(g, 178 * s, 78 * s, 65 * s, Color.FromArgb(70, 210, 50, 255)); // Purple
                DrawRadialGlow(g, 78 * s, 178 * s, 65 * s, Color.FromArgb(60, 0, 240, 100));  // Green
                DrawRadialGlow(g, 178 * s, 178 * s, 65 * s, Color.FromArgb(75, 0, 220, 255)); // Cyan

                // Subtle inner border
                using (Pen borderPen = new Pen(Color.FromArgb(50, 255, 255, 255), 1.5f * s)) {
                    g.DrawPath(borderPen, plate);
                }
            }

            // 2. Draw 4 Neon Symbols
            // Top-Left: Circle (Coral Red)
            DrawNeonCircle(g, 80 * s, 80 * s, 35 * s, Color.FromArgb(255, 45, 90), s);

            // Top-Right: Rounded Square (Magenta / Violet)
            DrawNeonSquare(g, 148 * s, 50 * s, 60 * s, 12 * s, Color.FromArgb(220, 60, 255), s);

            // Bottom-Left: Rounded Triangle (Neon Green)
            DrawNeonTriangle(g, 80 * s, 146 * s, 62 * s, 56 * s, Color.FromArgb(50, 240, 90), s);

            // Bottom-Right: Cross (Neon Cyan)
            DrawNeonCross(g, 178 * s, 174 * s, 56 * s, Color.FromArgb(0, 230, 255), s);
        }
        return bmp;
    }

    private static void DrawRadialGlow(Graphics g, float cx, float cy, float radius, Color color) {
        using (GraphicsPath p = new GraphicsPath()) {
            p.AddEllipse(cx - radius, cy - radius, radius * 2, radius * 2);
            using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                pgb.CenterColor = color;
                pgb.SurroundColors = new Color[] { Color.Transparent };
                g.FillPath(pgb, p);
            }
        }
    }

    private static void DrawNeonPath(Graphics g, GraphicsPath path, Color neonColor, float scale) {
        // Multi-layer Gaussian-style neon bloom
        int[] alphas = new int[] { 18, 35, 70, 140, 255 };
        float[] widths = new float[] { 18f, 11f, 6.5f, 3.8f, 2.0f };

        for (int i = 0; i < 4; i++) {
            using (Pen pen = new Pen(Color.FromArgb(alphas[i], neonColor), widths[i] * scale)) {
                pen.LineJoin = LineJoin.Round;
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                g.DrawPath(pen, path);
            }
        }

        // Brilliant hot white core
        Color coreColor = Color.FromArgb(250, 255, 255, 255);
        using (Pen corePen = new Pen(coreColor, 1.8f * scale)) {
            corePen.LineJoin = LineJoin.Round;
            corePen.StartCap = LineCap.Round;
            corePen.EndCap = LineCap.Round;
            g.DrawPath(corePen, path);
        }
    }

    private static void DrawNeonCircle(Graphics g, float cx, float cy, float r, Color color, float scale) {
        using (GraphicsPath p = new GraphicsPath()) {
            p.AddEllipse(cx - r, cy - r, r * 2, r * 2);
            DrawNeonPath(g, p, color, scale);
        }
    }

    private static void DrawNeonSquare(Graphics g, float x, float y, float size, float r, Color color, float scale) {
        using (GraphicsPath p = MakeRoundedRect(new RectangleF(x, y, size, size), r)) {
            DrawNeonPath(g, p, color, scale);
        }
    }

    private static void DrawNeonTriangle(Graphics g, float cx, float topY, float width, float height, Color color, float scale) {
        using (GraphicsPath p = new GraphicsPath()) {
            PointF top = new PointF(cx, topY);
            PointF left = new PointF(cx - width / 2.0f, topY + height);
            PointF right = new PointF(cx + width / 2.0f, topY + height);
            p.AddLines(new PointF[] { top, right, left, top });
            p.CloseFigure();
            DrawNeonPath(g, p, color, scale);
        }
    }

    private static void DrawNeonCross(Graphics g, float cx, float cy, float span, Color color, float scale) {
        float h = span / 2.0f;
        using (GraphicsPath p1 = new GraphicsPath()) {
            p1.AddLine(cx - h, cy - h, cx + h, cy + h);
            DrawNeonPath(g, p1, color, scale);
        }
        using (GraphicsPath p2 = new GraphicsPath()) {
            p2.AddLine(cx + h, cy - h, cx - h, cy + h);
            DrawNeonPath(g, p2, color, scale);
        }
    }

    private static GraphicsPath MakeRoundedRect(RectangleF rect, float r) {
        GraphicsPath path = new GraphicsPath();
        float d = r * 2;
        path.AddArc(rect.X, rect.Y, d, d, 180, 90);
        path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
        path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
        path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    public static void CreateMultiResIco(string outputPath) {
        int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
        byte[][] imageBuffers = new byte[sizes.Length][];

        for (int i = 0; i < sizes.Length; i++) {
            int s = sizes[i];
            using (Bitmap bmp = RenderIcon(s)) {
                if (s == 256) {
                    using (MemoryStream ms = new MemoryStream()) {
                        bmp.Save(ms, ImageFormat.Png);
                        imageBuffers[i] = ms.ToArray();
                    }
                } else {
                    imageBuffers[i] = CreateDibBuffer(bmp, s);
                }
            }
        }

        using (FileStream fs = new FileStream(outputPath, FileMode.Create)) {
            using (BinaryWriter bw = new BinaryWriter(fs)) {
                bw.Write((ushort)0);
                bw.Write((ushort)1);
                bw.Write((ushort)sizes.Length);

                int offset = 6 + (16 * sizes.Length);
                for (int i = 0; i < sizes.Length; i++) {
                    int s = sizes[i];
                    bw.Write((byte)(s >= 256 ? 0 : s));
                    bw.Write((byte)(s >= 256 ? 0 : s));
                    bw.Write((byte)0);
                    bw.Write((byte)0);
                    bw.Write((ushort)1);
                    bw.Write((ushort)32);
                    bw.Write((uint)imageBuffers[i].Length);
                    bw.Write((uint)offset);
                    offset += imageBuffers[i].Length;
                }

                for (int i = 0; i < sizes.Length; i++) {
                    bw.Write(imageBuffers[i]);
                }
            }
        }
    }

    private static byte[] CreateDibBuffer(Bitmap bmp, int size) {
        int width = size;
        int height = size;
        int imageSize = width * height * 4;
        int maskRowStride = ((width + 31) / 32) * 4;
        int maskSize = maskRowStride * height;
        int headerSize = 40;
        int totalSize = headerSize + imageSize + maskSize;

        byte[] buffer = new byte[totalSize];
        using (MemoryStream ms = new MemoryStream(buffer)) {
            using (BinaryWriter bw = new BinaryWriter(ms)) {
                bw.Write((uint)headerSize);
                bw.Write((int)width);
                bw.Write((int)(height * 2));
                bw.Write((ushort)1);
                bw.Write((ushort)32);
                bw.Write((uint)0);
                bw.Write((uint)imageSize);
                bw.Write((int)0);
                bw.Write((int)0);
                bw.Write((uint)0);
                bw.Write((uint)0);

                BitmapData data = bmp.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                try {
                    byte[] row = new byte[width * 4];
                    for (int y = height - 1; y >= 0; y--) {
                        IntPtr rowPtr = IntPtr.Add(data.Scan0, y * data.Stride);
                        System.Runtime.InteropServices.Marshal.Copy(rowPtr, row, 0, row.Length);
                        bw.Write(row);
                    }
                } finally {
                    bmp.UnlockBits(data);
                }

                byte[] mask = new byte[maskSize];
                bw.Write(mask);
            }
        }
        return buffer;
    }
}
