using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class IconTool {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void ConvertPngToIco(string pngPath, string icoPath) {
        using (Bitmap src = new Bitmap(pngPath)) {
            int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
            byte[][] pngBytes = new byte[sizes.Length][];

            for (int i = 0; i < sizes.Length; i++) {
                int s = sizes[i];
                using (Bitmap target = new Bitmap(s, s, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(target)) {
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.Clear(Color.Transparent);
                        g.DrawImage(src, new Rectangle(0, 0, s, s));
                    }
                    using (MemoryStream ms = new MemoryStream()) {
                        target.Save(ms, ImageFormat.Png);
                        pngBytes[i] = ms.ToArray();
                    }
                }
            }

            using (FileStream fs = new FileStream(icoPath, FileMode.Create)) {
                using (BinaryWriter bw = new BinaryWriter(fs)) {
                    bw.Write((ushort)0); // Reserved
                    bw.Write((ushort)1); // Type: 1 = ICO
                    bw.Write((ushort)sizes.Length); // Count

                    int offset = 6 + (16 * sizes.Length);
                    for (int i = 0; i < sizes.Length; i++) {
                        int s = sizes[i];
                        bw.Write((byte)(s >= 256 ? 0 : s)); // Width
                        bw.Write((byte)(s >= 256 ? 0 : s)); // Height
                        bw.Write((byte)0); // Colors
                        bw.Write((byte)0); // Reserved
                        bw.Write((ushort)1); // Planes
                        bw.Write((ushort)32); // Bit count
                        bw.Write((uint)pngBytes[i].Length); // Bytes in res
                        bw.Write((uint)offset); // Image offset
                        offset += pngBytes[i].Length;
                    }

                    for (int i = 0; i < sizes.Length; i++) {
                        bw.Write(pngBytes[i]);
                    }
                }
            }
        }
        // Notify shell of association / icon change
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
