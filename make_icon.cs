using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class IconGenerator {
    public static Bitmap CreateNeonJangBitmap(int size) {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;

            float scale = size / 256.0f;

            // Background Rounded Cyber Plate
            float margin = 12 * scale;
            RectangleF rect = new RectangleF(margin, margin, size - 2 * margin, size - 2 * margin);
            
            using (GraphicsPath path = new GraphicsPath()) {
                float radius = 48 * scale;
                path.AddArc(rect.X, rect.Y, radius, radius, 180, 90);
                path.AddArc(rect.Right - radius, rect.Y, radius, radius, 270, 90);
                path.AddArc(rect.Right - radius, rect.Bottom - radius, radius, radius, 0, 90);
                path.AddArc(rect.X, rect.Bottom - radius, radius, radius, 90, 90);
                path.CloseFigure();

                // Cyber dark plate gradient fill
                using (LinearGradientBrush bgBrush = new LinearGradientBrush(rect, Color.FromArgb(245, 10, 14, 23), Color.FromArgb(245, 5, 7, 12), 45f)) {
                    g.FillPath(bgBrush, path);
                }

                // Neon Outer Glow (Cyan #00f0ff)
                using (Pen glowPen = new Pen(Color.FromArgb(60, 0, 240, 255), 10 * scale)) {
                    g.DrawPath(glowPen, path);
                }
                using (Pen borderPen = new Pen(Color.FromArgb(230, 0, 240, 255), 3.5f * scale)) {
                    g.DrawPath(borderPen, path);
                }
                // Inner Orange Accent Ring
                rect.Inflate(-6 * scale, -6 * scale);
                using (GraphicsPath innerPath = new GraphicsPath()) {
                    float r2 = 38 * scale;
                    innerPath.AddArc(rect.X, rect.Y, r2, r2, 180, 90);
                    innerPath.AddArc(rect.Right - r2, rect.Y, r2, r2, 270, 90);
                    innerPath.AddArc(rect.Right - r2, rect.Bottom - r2, r2, r2, 0, 90);
                    innerPath.AddArc(rect.X, rect.Bottom - r2, r2, r2, 90, 90);
                    innerPath.CloseFigure();
                    using (Pen innerPen = new Pen(Color.FromArgb(160, 255, 120, 0), 1.8f * scale)) {
                        g.DrawPath(innerPen, innerPath);
                    }
                }
            }

            // Draw Stylized Glowing "J"
            string text = "J";
            using (Font font = new Font("Arial Black", 112 * scale, FontStyle.Bold)) {
                StringFormat sf = new StringFormat();
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;

                // Deep glow & text paths
                using (GraphicsPath textPath = new GraphicsPath()) {
                    textPath.AddString(text, font.FontFamily, (int)font.Style, font.Size, new PointF(size / 2.0f, size / 2.0f - 10 * scale), sf);

                    // Outer cyan glow
                    using (Pen pen = new Pen(Color.FromArgb(70, 0, 240, 255), 18 * scale)) {
                        pen.LineJoin = LineJoin.Round;
                        g.DrawPath(pen, textPath);
                    }
                    // Orange flare glow
                    using (Pen pen = new Pen(Color.FromArgb(140, 255, 90, 0), 10 * scale)) {
                        pen.LineJoin = LineJoin.Round;
                        g.DrawPath(pen, textPath);
                    }
                    // Crisp neon orange/yellow outline
                    using (Pen pen = new Pen(Color.FromArgb(255, 255, 180, 0), 4 * scale)) {
                        pen.LineJoin = LineJoin.Round;
                        g.DrawPath(pen, textPath);
                    }
                    // Core gradient fill (white-hot top to vivid orange bottom)
                    using (LinearGradientBrush textBrush = new LinearGradientBrush(new PointF(0, 40 * scale), new PointF(0, 190 * scale), Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 255, 110, 0))) {
                        g.FillPath(textBrush, textPath);
                    }
                }
            }

            // Subtitle "JANG" badge at bottom
            RectangleF badgeRect = new RectangleF(size / 2.0f - 48 * scale, size - 56 * scale, 96 * scale, 22 * scale);
            using (GraphicsPath bPath = new GraphicsPath()) {
                float br = 8 * scale;
                bPath.AddArc(badgeRect.X, badgeRect.Y, br, br, 180, 90);
                bPath.AddArc(badgeRect.Right - br, badgeRect.Y, br, br, 270, 90);
                bPath.AddArc(badgeRect.Right - br, badgeRect.Bottom - br, br, br, 0, 90);
                bPath.AddArc(badgeRect.X, badgeRect.Bottom - br, br, br, 90, 90);
                bPath.CloseFigure();
                using (SolidBrush bBg = new SolidBrush(Color.FromArgb(230, 0, 240, 255))) {
                    g.FillPath(bBg, bPath);
                }
            }
            using (Font subFont = new Font("Segoe UI", 12 * scale, FontStyle.Bold)) {
                StringFormat bsf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                using (SolidBrush textB = new SolidBrush(Color.FromArgb(255, 10, 14, 23))) {
                    g.DrawString("JANG", subFont, textB, badgeRect, bsf);
                }
            }

            // Top-right controller 4 diamond glowing dots (Cyber accents)
            float cx = size - 50 * scale;
            float cy = 50 * scale;
            float rDot = 3.5f * scale;
            Color[] colors = new Color[] {
                Color.FromArgb(255, 0, 240, 255),
                Color.FromArgb(255, 255, 170, 0),
                Color.FromArgb(255, 0, 255, 150),
                Color.FromArgb(255, 255, 60, 100)
            };
            PointF[] centers = new PointF[] {
                new PointF(cx, cy - 8 * scale),
                new PointF(cx + 8 * scale, cy),
                new PointF(cx, cy + 8 * scale),
                new PointF(cx - 8 * scale, cy)
            };
            for (int i = 0; i < 4; i++) {
                using (SolidBrush dotBrush = new SolidBrush(colors[i])) {
                    g.FillEllipse(dotBrush, centers[i].X - rDot, centers[i].Y - rDot, rDot * 2, rDot * 2);
                }
            }
        }
        return bmp;
    }

    public static void SaveAsIco(string outputPath) {
        int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
        byte[][] pngBytes = new byte[sizes.Length][];
        for (int i = 0; i < sizes.Length; i++) {
            using (Bitmap b = CreateNeonJangBitmap(sizes[i])) {
                using (MemoryStream ms = new MemoryStream()) {
                    b.Save(ms, ImageFormat.Png);
                    pngBytes[i] = ms.ToArray();
                }
            }
        }

        using (FileStream fs = new FileStream(outputPath, FileMode.Create)) {
            using (BinaryWriter bw = new BinaryWriter(fs)) {
                // ICONDIR header
                bw.Write((ushort)0); // Reserved
                bw.Write((ushort)1); // Type: 1 for ICO
                bw.Write((ushort)sizes.Length); // Count

                int offset = 6 + (16 * sizes.Length);
                for (int i = 0; i < sizes.Length; i++) {
                    int s = sizes[i];
                    bw.Write((byte)(s >= 256 ? 0 : s)); // Width
                    bw.Write((byte)(s >= 256 ? 0 : s)); // Height
                    bw.Write((byte)0); // Colors
                    bw.Write((byte)0); // Reserved
                    bw.Write((ushort)1); // Color planes
                    bw.Write((ushort)32); // Bits per pixel
                    bw.Write((uint)pngBytes[i].Length); // Size of image data
                    bw.Write((uint)offset); // Offset
                    offset += pngBytes[i].Length;
                }

                for (int i = 0; i < sizes.Length; i++) {
                    bw.Write(pngBytes[i]);
                }
            }
        }
    }
}
