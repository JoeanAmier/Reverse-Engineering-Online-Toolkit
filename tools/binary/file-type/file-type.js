/**
 * 文件类型检测工具
 * @description 基于 Magic Number 检测文件真实类型
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * Magic Number 签名数据库
     * 格式: { magic: [字节数组], offset: 偏移量, type: 类型名, mime: MIME类型, ext: 扩展名, icon: 图标, category: 分类 }
     */
    const SIGNATURES = [
        // ==================== 压缩格式 ====================
        { magic: [0x1F, 0x8B], type: 'GZIP Compressed', mime: 'application/gzip', ext: 'gz', icon: '📦', category: 'compression' },
        { magic: [0x78, 0x01], type: 'Zlib Compressed (No Compression)', mime: 'application/zlib', ext: 'zz', icon: '📦', category: 'compression' },
        { magic: [0x78, 0x5E], type: 'Zlib Compressed (Fast)', mime: 'application/zlib', ext: 'zz', icon: '📦', category: 'compression' },
        { magic: [0x78, 0x9C], type: 'Zlib Compressed (Default)', mime: 'application/zlib', ext: 'zz', icon: '📦', category: 'compression' },
        { magic: [0x78, 0xDA], type: 'Zlib Compressed (Best)', mime: 'application/zlib', ext: 'zz', icon: '📦', category: 'compression' },
        { magic: [0x28, 0xB5, 0x2F, 0xFD], type: 'Zstandard (ZSTD) Compressed', mime: 'application/zstd', ext: 'zst', icon: '📦', category: 'compression' },
        { magic: [0x04, 0x22, 0x4D, 0x18], type: 'LZ4 Frame', mime: 'application/x-lz4', ext: 'lz4', icon: '📦', category: 'compression' },
        { magic: [0x02, 0x21, 0x4C, 0x18], type: 'LZ4 Legacy', mime: 'application/x-lz4', ext: 'lz4', icon: '📦', category: 'compression' },
        { magic: [0x5D, 0x00, 0x00], type: 'LZMA Compressed', mime: 'application/x-lzma', ext: 'lzma', icon: '📦', category: 'compression' },
        { magic: [0x42, 0x5A, 0x68], type: 'BZIP2 Compressed', mime: 'application/x-bzip2', ext: 'bz2', icon: '📦', category: 'compression' },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'ZIP Archive', mime: 'application/zip', ext: 'zip', icon: '📦', category: 'compression' },
        { magic: [0x50, 0x4B, 0x05, 0x06], type: 'ZIP Archive (Empty)', mime: 'application/zip', ext: 'zip', icon: '📦', category: 'compression' },
        { magic: [0x50, 0x4B, 0x07, 0x08], type: 'ZIP Archive (Spanned)', mime: 'application/zip', ext: 'zip', icon: '📦', category: 'compression' },
        { magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], type: 'RAR Archive (v4)', mime: 'application/x-rar-compressed', ext: 'rar', icon: '📦', category: 'compression' },
        { magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00], type: 'RAR Archive (v5)', mime: 'application/x-rar-compressed', ext: 'rar', icon: '📦', category: 'compression' },
        { magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], type: '7-Zip Archive', mime: 'application/x-7z-compressed', ext: '7z', icon: '📦', category: 'compression' },
        { magic: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00], type: 'XZ Compressed', mime: 'application/x-xz', ext: 'xz', icon: '📦', category: 'compression' },
        { magic: [0x75, 0x73, 0x74, 0x61, 0x72], type: 'TAR Archive', mime: 'application/x-tar', ext: 'tar', icon: '📦', category: 'compression', offset: 257 },
        { magic: [0x1F, 0x9D], type: 'LZW Compressed', mime: 'application/x-compress', ext: 'Z', icon: '📦', category: 'compression' },
        { magic: [0x1F, 0xA0], type: 'LZH Compressed', mime: 'application/x-lzh', ext: 'lzh', icon: '📦', category: 'compression' },

        // ==================== 移动应用 ====================
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Android APK', mime: 'application/vnd.android.package-archive', ext: 'apk', icon: '📱', category: 'mobile', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.apk') },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Android App Bundle (AAB)', mime: 'application/x-authorware-bin', ext: 'aab', icon: '📱', category: 'mobile', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.aab') },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'iOS App (IPA)', mime: 'application/x-ios-app', ext: 'ipa', icon: '📱', category: 'mobile', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.ipa') },
        { magic: [0x64, 0x65, 0x78, 0x0A], type: 'Android DEX (Dalvik)', mime: 'application/x-dex', ext: 'dex', icon: '📱', category: 'mobile' },
        { magic: [0x64, 0x65, 0x79, 0x0A], type: 'Android ODEX (Optimized DEX)', mime: 'application/x-odex', ext: 'odex', icon: '📱', category: 'mobile' },
        { magic: [0x76, 0x64, 0x65, 0x78], type: 'Android VDEX', mime: 'application/x-vdex', ext: 'vdex', icon: '📱', category: 'mobile' },
        { magic: [0x6F, 0x61, 0x74, 0x0A], type: 'Android OAT', mime: 'application/x-oat', ext: 'oat', icon: '📱', category: 'mobile' },
        { magic: [0x61, 0x72, 0x74, 0x0A], type: 'Android ART Image', mime: 'application/x-art', ext: 'art', icon: '📱', category: 'mobile' },
        { magic: [0x03, 0x00, 0x08, 0x00], type: 'Android Binary XML (AXML)', mime: 'application/x-axml', ext: 'xml', icon: '📱', category: 'mobile' },
        { magic: [0x02, 0x00, 0x0C, 0x00], type: 'Android Resources (ARSC)', mime: 'application/x-arsc', ext: 'arsc', icon: '📱', category: 'mobile' },

        // ==================== 可执行文件与二进制 ====================
        { magic: [0x4D, 0x5A], type: 'Windows PE (EXE/DLL/SYS)', mime: 'application/x-msdownload', ext: 'exe', icon: '⚙️', category: 'executable' },
        { magic: [0x7F, 0x45, 0x4C, 0x46, 0x01, 0x01], type: 'ELF 32-bit LSB', mime: 'application/x-executable', ext: 'elf', icon: '⚙️', category: 'executable' },
        { magic: [0x7F, 0x45, 0x4C, 0x46, 0x01, 0x02], type: 'ELF 32-bit MSB', mime: 'application/x-executable', ext: 'elf', icon: '⚙️', category: 'executable' },
        { magic: [0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01], type: 'ELF 64-bit LSB', mime: 'application/x-executable', ext: 'elf', icon: '⚙️', category: 'executable' },
        { magic: [0x7F, 0x45, 0x4C, 0x46, 0x02, 0x02], type: 'ELF 64-bit MSB', mime: 'application/x-executable', ext: 'elf', icon: '⚙️', category: 'executable' },
        { magic: [0x7F, 0x45, 0x4C, 0x46], type: 'ELF Executable/Library', mime: 'application/x-executable', ext: 'elf', icon: '⚙️', category: 'executable' },
        { magic: [0xCF, 0xFA, 0xED, 0xFE], type: 'Mach-O 64-bit (x86_64/ARM64)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0xCE, 0xFA, 0xED, 0xFE], type: 'Mach-O 32-bit', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0xFE, 0xED, 0xFA, 0xCF], type: 'Mach-O 64-bit (BE)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0xFE, 0xED, 0xFA, 0xCE], type: 'Mach-O 32-bit (BE)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0xCA, 0xFE, 0xBA, 0xBE], type: 'Mach-O Universal Binary (Fat)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable', check: (bytes) => {
            // Java class files also start with CAFEBABE but have different following bytes
            // Fat binaries have arch count as next 4 bytes (usually small number)
            const archCount = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
            return archCount > 0 && archCount < 20; // Reasonable number of architectures
        }},
        { magic: [0xCA, 0xFE, 0xBA, 0xBF], type: 'Mach-O Universal Binary (64-bit Fat)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0xBE, 0xBA, 0xFE, 0xCA], type: 'Mach-O Universal Binary (Fat, BE)', mime: 'application/x-mach-binary', ext: 'macho', icon: '🍎', category: 'executable' },
        { magic: [0x00, 0x61, 0x73, 0x6D], type: 'WebAssembly (WASM)', mime: 'application/wasm', ext: 'wasm', icon: '🌐', category: 'executable' },
        { magic: [0xCA, 0xFE, 0xBA, 0xBE], type: 'Java Class File', mime: 'application/java-vm', ext: 'class', icon: '☕', category: 'executable', check: (bytes) => {
            // Java class minor version at bytes 4-5, major version at bytes 6-7
            const majorVersion = (bytes[6] << 8) | bytes[7];
            return majorVersion >= 45 && majorVersion <= 70; // Java 1.0 to Java 26
        }},
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Java JAR Archive', mime: 'application/java-archive', ext: 'jar', icon: '☕', category: 'executable', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.jar') },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Java WAR Archive', mime: 'application/java-archive', ext: 'war', icon: '☕', category: 'executable', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.war') },

        // ==================== 脚本与字节码 ====================
        { magic: [0x1B, 0x4C, 0x75, 0x61], type: 'Lua Bytecode', mime: 'application/x-lua-bytecode', ext: 'luac', icon: '🌙', category: 'bytecode' },
        { magic: [0x42, 0x43, 0xC0, 0xDE], type: 'LLVM Bitcode', mime: 'application/x-llvm', ext: 'bc', icon: '⚙️', category: 'bytecode' },
        // Python 3.x bytecode (various magic numbers)
        { magic: [0x61, 0x0D, 0x0D, 0x0A], type: 'Python 3.9 Bytecode', mime: 'application/x-python-code', ext: 'pyc', icon: '🐍', category: 'bytecode' },
        { magic: [0x6F, 0x0D, 0x0D, 0x0A], type: 'Python 3.10 Bytecode', mime: 'application/x-python-code', ext: 'pyc', icon: '🐍', category: 'bytecode' },
        { magic: [0xA7, 0x0D, 0x0D, 0x0A], type: 'Python 3.11 Bytecode', mime: 'application/x-python-code', ext: 'pyc', icon: '🐍', category: 'bytecode' },
        { magic: [0xCB, 0x0D, 0x0D, 0x0A], type: 'Python 3.12 Bytecode', mime: 'application/x-python-code', ext: 'pyc', icon: '🐍', category: 'bytecode' },
        { magic: [0x23, 0x21], type: 'Shell Script (Shebang)', mime: 'text/x-shellscript', ext: 'sh', icon: '📜', category: 'bytecode' },

        // ==================== 调试与分析 ====================
        { magic: [0x4D, 0x69, 0x63, 0x72, 0x6F, 0x73, 0x6F, 0x66, 0x74, 0x20, 0x43, 0x2F, 0x43, 0x2B, 0x2B, 0x20], type: 'Microsoft PDB', mime: 'application/x-pdb', ext: 'pdb', icon: '🔍', category: 'debug' },
        { magic: [0x4D, 0x44, 0x4D, 0x50], type: 'Windows Minidump', mime: 'application/x-dmp', ext: 'dmp', icon: '🔍', category: 'debug' },
        { magic: [0x50, 0x41, 0x47, 0x45, 0x44, 0x55], type: 'Windows Memory Dump (Full)', mime: 'application/x-dmp', ext: 'dmp', icon: '🔍', category: 'debug' },
        { magic: [0x50, 0x41, 0x47, 0x45, 0x44, 0x55, 0x36, 0x34], type: 'Windows Memory Dump (64-bit)', mime: 'application/x-dmp', ext: 'dmp', icon: '🔍', category: 'debug' },

        // ==================== 磁盘镜像与固件 ====================
        { magic: [0x43, 0x44, 0x30, 0x30, 0x31], type: 'ISO 9660 CD/DVD Image', mime: 'application/x-iso9660-image', ext: 'iso', icon: '💿', category: 'disk', offset: 0x8001 },
        { magic: [0x45, 0x52, 0x02, 0x00], type: 'macOS DMG (Disk Image)', mime: 'application/x-apple-diskimage', ext: 'dmg', icon: '💿', category: 'disk' },
        { magic: [0x78, 0x01, 0x73, 0x0D, 0x62, 0x62, 0x60], type: 'macOS DMG (Compressed)', mime: 'application/x-apple-diskimage', ext: 'dmg', icon: '💿', category: 'disk' },
        { magic: [0x6B, 0x6F, 0x6C, 0x79], type: 'macOS DMG (koly trailer)', mime: 'application/x-apple-diskimage', ext: 'dmg', icon: '💿', category: 'disk' },
        { magic: [0x63, 0x6F, 0x6E, 0x65, 0x63, 0x74, 0x69, 0x78], type: 'VirtualBox VHD', mime: 'application/x-vhd', ext: 'vhd', icon: '💿', category: 'disk' },
        { magic: [0x4B, 0x44, 0x4D, 0x56], type: 'VMware VMDK (Sparse)', mime: 'application/x-vmdk', ext: 'vmdk', icon: '💿', category: 'disk' },
        { magic: [0x51, 0x46, 0x49, 0xFB], type: 'QEMU QCOW/QCOW2', mime: 'application/x-qcow', ext: 'qcow2', icon: '💿', category: 'disk' },
        { magic: [0xEB, 0x3C, 0x90], type: 'FAT Boot Sector', mime: 'application/x-fat', ext: 'img', icon: '💿', category: 'disk' },
        { magic: [0xEB, 0x58, 0x90], type: 'NTFS Boot Sector', mime: 'application/x-ntfs', ext: 'img', icon: '💿', category: 'disk' },

        // ==================== 加密与证书 ====================
        { magic: [0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x42, 0x45, 0x47, 0x49, 0x4E], type: 'PEM Certificate/Key', mime: 'application/x-pem-file', ext: 'pem', icon: '🔐', category: 'crypto' },
        { magic: [0x30, 0x82], type: 'DER Certificate/Key', mime: 'application/x-x509-ca-cert', ext: 'der', icon: '🔐', category: 'crypto' },
        { magic: [0x30, 0x80], type: 'ASN.1 BER Encoded', mime: 'application/x-ber', ext: 'ber', icon: '🔐', category: 'crypto' },
        { magic: [0xFE, 0xED, 0xFE, 0xED], type: 'Java KeyStore (JKS)', mime: 'application/x-java-keystore', ext: 'jks', icon: '🔐', category: 'crypto' },
        { magic: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xCE, 0xCE, 0xCE, 0xCE], type: 'Java JCEKS KeyStore', mime: 'application/x-java-jce-keystore', ext: 'jceks', icon: '🔐', category: 'crypto', offset: 0 },
        { magic: [0x85], type: 'PGP Signature (Old)', mime: 'application/pgp-signature', ext: 'sig', icon: '🔐', category: 'crypto' },
        { magic: [0x99], type: 'PGP Public Key (Old)', mime: 'application/pgp-keys', ext: 'pgp', icon: '🔐', category: 'crypto' },
        { magic: [0xC5], type: 'PGP Compressed', mime: 'application/pgp-encrypted', ext: 'pgp', icon: '🔐', category: 'crypto' },

        // ==================== 数据库 ====================
        { magic: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00], type: 'SQLite 3 Database', mime: 'application/x-sqlite3', ext: 'sqlite', icon: '🗄️', category: 'database' },
        { magic: [0x00, 0x06, 0x15, 0x61], type: 'LevelDB Table', mime: 'application/x-leveldb', ext: 'ldb', icon: '🗄️', category: 'database' },
        { magic: [0x52, 0x45, 0x41, 0x4C, 0x4D], type: 'Realm Mobile Database', mime: 'application/x-realm', ext: 'realm', icon: '🗄️', category: 'database' },
        { magic: [0x1A, 0x00, 0x00, 0x00], type: 'Firebird Database', mime: 'application/x-firebird', ext: 'fdb', icon: '🗄️', category: 'database' },

        // ==================== 游戏与资源 ====================
        { magic: [0x55, 0x6E, 0x69, 0x74, 0x79, 0x46, 0x53], type: 'Unity AssetBundle', mime: 'application/x-unity', ext: 'unity3d', icon: '🎮', category: 'game' },
        { magic: [0x55, 0x6E, 0x69, 0x74, 0x79, 0x57, 0x65, 0x62], type: 'Unity Web Data', mime: 'application/x-unity-web', ext: 'unityweb', icon: '🎮', category: 'game' },
        { magic: [0x89, 0x50, 0x56, 0x52, 0x03], type: 'PowerVR Texture (PVR)', mime: 'image/x-pvr', ext: 'pvr', icon: '🎮', category: 'game' },
        { magic: [0x44, 0x44, 0x53, 0x20], type: 'DirectDraw Surface (DDS)', mime: 'image/vnd-ms.dds', ext: 'dds', icon: '🎮', category: 'game' },
        { magic: [0x4B, 0x54, 0x58, 0x20], type: 'Khronos Texture (KTX)', mime: 'image/ktx', ext: 'ktx', icon: '🎮', category: 'game' },
        { magic: [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB], type: 'Khronos Texture 2 (KTX2)', mime: 'image/ktx2', ext: 'ktx2', icon: '🎮', category: 'game' },

        // ==================== 图片格式 ====================
        { magic: [0xFF, 0xD8, 0xFF], type: 'JPEG Image', mime: 'image/jpeg', ext: 'jpg', icon: '🖼️', category: 'image' },
        { magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], type: 'PNG Image', mime: 'image/png', ext: 'png', icon: '🖼️', category: 'image' },
        { magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], type: 'GIF Image (87a)', mime: 'image/gif', ext: 'gif', icon: '🖼️', category: 'image' },
        { magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], type: 'GIF Image (89a)', mime: 'image/gif', ext: 'gif', icon: '🖼️', category: 'image' },
        { magic: [0x42, 0x4D], type: 'BMP Image', mime: 'image/bmp', ext: 'bmp', icon: '🖼️', category: 'image' },
        { magic: [0x00, 0x00, 0x01, 0x00], type: 'ICO Icon', mime: 'image/x-icon', ext: 'ico', icon: '🖼️', category: 'image' },
        { magic: [0x00, 0x00, 0x02, 0x00], type: 'CUR Cursor', mime: 'image/x-cursor', ext: 'cur', icon: '🖼️', category: 'image' },
        { magic: [0x49, 0x49, 0x2A, 0x00], type: 'TIFF Image (LE)', mime: 'image/tiff', ext: 'tiff', icon: '🖼️', category: 'image' },
        { magic: [0x4D, 0x4D, 0x00, 0x2A], type: 'TIFF Image (BE)', mime: 'image/tiff', ext: 'tiff', icon: '🖼️', category: 'image' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'WebP Image', mime: 'image/webp', ext: 'webp', icon: '🖼️', category: 'image', check: (bytes) => bytes.slice(8, 12).join(',') === [0x57, 0x45, 0x42, 0x50].join(',') },
        { magic: [0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20], type: 'JPEG 2000', mime: 'image/jp2', ext: 'jp2', icon: '🖼️', category: 'image' },
        { magic: [0xFF, 0x0A], type: 'JPEG XL', mime: 'image/jxl', ext: 'jxl', icon: '🖼️', category: 'image' },
        { magic: [0x00, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x00, 0x00, 0x6A, 0x58, 0x4C, 0x20], type: 'JPEG XL (Container)', mime: 'image/jxl', ext: 'jxl', icon: '🖼️', category: 'image' },
        { magic: [0x38, 0x42, 0x50, 0x53], type: 'Adobe Photoshop (PSD)', mime: 'image/vnd.adobe.photoshop', ext: 'psd', icon: '🖼️', category: 'image' },
        { magic: [0x49, 0x43, 0x4E, 0x53], type: 'macOS Icon (ICNS)', mime: 'image/x-icns', ext: 'icns', icon: '🖼️', category: 'image' },
        { magic: [0x00, 0x00, 0x00], type: 'HEIC/HEIF Image', mime: 'image/heic', ext: 'heic', icon: '🖼️', category: 'image', check: (bytes) => {
            const str = String.fromCharCode(...bytes.slice(4, 12));
            return str.includes('ftyp') && (str.includes('heic') || str.includes('heix') || str.includes('mif1'));
        }},
        { magic: [0x00, 0x00, 0x00], type: 'AVIF Image', mime: 'image/avif', ext: 'avif', icon: '🖼️', category: 'image', check: (bytes) => {
            const str = String.fromCharCode(...bytes.slice(4, 12));
            return str.includes('ftyp') && str.includes('avif');
        }},

        // ==================== 音频格式 ====================
        { magic: [0x49, 0x44, 0x33], type: 'MP3 Audio (ID3v2)', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵', category: 'audio' },
        { magic: [0xFF, 0xFB], type: 'MP3 Audio', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵', category: 'audio' },
        { magic: [0xFF, 0xFA], type: 'MP3 Audio', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵', category: 'audio' },
        { magic: [0xFF, 0xF3], type: 'MP3 Audio', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵', category: 'audio' },
        { magic: [0x4F, 0x67, 0x67, 0x53], type: 'OGG Audio/Video', mime: 'audio/ogg', ext: 'ogg', icon: '🎵', category: 'audio' },
        { magic: [0x66, 0x4C, 0x61, 0x43], type: 'FLAC Audio', mime: 'audio/flac', ext: 'flac', icon: '🎵', category: 'audio' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'WAV Audio', mime: 'audio/wav', ext: 'wav', icon: '🎵', category: 'audio', check: (bytes) => bytes.slice(8, 12).join(',') === [0x57, 0x41, 0x56, 0x45].join(',') },
        { magic: [0x00, 0x00, 0x00], type: 'M4A/AAC Audio', mime: 'audio/mp4', ext: 'm4a', icon: '🎵', category: 'audio', check: (bytes) => {
            const str = String.fromCharCode(...bytes.slice(4, 8));
            return str === 'ftyp' && String.fromCharCode(...bytes.slice(8, 12)).includes('M4A');
        }},
        { magic: [0x4D, 0x54, 0x68, 0x64], type: 'MIDI Audio', mime: 'audio/midi', ext: 'mid', icon: '🎵', category: 'audio' },
        { magic: [0x77, 0x76, 0x70, 0x6B], type: 'WavPack Audio', mime: 'audio/wavpack', ext: 'wv', icon: '🎵', category: 'audio' },
        { magic: [0x23, 0x21, 0x41, 0x4D, 0x52], type: 'AMR Audio', mime: 'audio/amr', ext: 'amr', icon: '🎵', category: 'audio' },

        // ==================== 视频格式 ====================
        { magic: [0x00, 0x00, 0x00], type: 'MP4 Video', mime: 'video/mp4', ext: 'mp4', icon: '🎬', category: 'video', check: (bytes) => {
            const str = String.fromCharCode(...bytes.slice(4, 8));
            return str === 'ftyp';
        }},
        { magic: [0x1A, 0x45, 0xDF, 0xA3], type: 'MKV/WebM Video', mime: 'video/x-matroska', ext: 'mkv', icon: '🎬', category: 'video' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'AVI Video', mime: 'video/x-msvideo', ext: 'avi', icon: '🎬', category: 'video', check: (bytes) => bytes.slice(8, 12).join(',') === [0x41, 0x56, 0x49, 0x20].join(',') },
        { magic: [0x46, 0x4C, 0x56, 0x01], type: 'FLV Video', mime: 'video/x-flv', ext: 'flv', icon: '🎬', category: 'video' },
        { magic: [0x00, 0x00, 0x01, 0xBA], type: 'MPEG-PS Video', mime: 'video/mpeg', ext: 'mpg', icon: '🎬', category: 'video' },
        { magic: [0x00, 0x00, 0x01, 0xB3], type: 'MPEG Video', mime: 'video/mpeg', ext: 'mpg', icon: '🎬', category: 'video' },
        { magic: [0x47], type: 'MPEG-TS Video', mime: 'video/mp2t', ext: 'ts', icon: '🎬', category: 'video', check: (bytes) => bytes[188] === 0x47 },
        { magic: [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11], type: 'ASF/WMV Video', mime: 'video/x-ms-asf', ext: 'wmv', icon: '🎬', category: 'video' },

        // ==================== 文档格式 ====================
        { magic: [0x25, 0x50, 0x44, 0x46], type: 'PDF Document', mime: 'application/pdf', ext: 'pdf', icon: '📕', category: 'document' },
        { magic: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], type: 'MS Office (OLE) DOC/XLS/PPT', mime: 'application/msword', ext: 'doc', icon: '📄', category: 'document' },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Office Open XML (DOCX/XLSX/PPTX)', mime: 'application/vnd.openxmlformats-officedocument', ext: 'docx', icon: '📄', category: 'document', check: (bytes, file) => {
            const name = file?.name?.toLowerCase() || '';
            return name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.pptx') || name.endsWith('.odt') || name.endsWith('.ods');
        }},
        { magic: [0x7B, 0x5C, 0x72, 0x74, 0x66], type: 'Rich Text Format (RTF)', mime: 'application/rtf', ext: 'rtf', icon: '📄', category: 'document' },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'EPUB eBook', mime: 'application/epub+zip', ext: 'epub', icon: '📚', category: 'document', check: (bytes, file) => file?.name?.toLowerCase().endsWith('.epub') },

        // ==================== 字体格式 ====================
        { magic: [0x00, 0x01, 0x00, 0x00], type: 'TrueType Font (TTF)', mime: 'font/ttf', ext: 'ttf', icon: '🔤', category: 'font' },
        { magic: [0x4F, 0x54, 0x54, 0x4F], type: 'OpenType Font (OTF)', mime: 'font/otf', ext: 'otf', icon: '🔤', category: 'font' },
        { magic: [0x77, 0x4F, 0x46, 0x46], type: 'Web Open Font (WOFF)', mime: 'font/woff', ext: 'woff', icon: '🔤', category: 'font' },
        { magic: [0x77, 0x4F, 0x46, 0x32], type: 'Web Open Font 2 (WOFF2)', mime: 'font/woff2', ext: 'woff2', icon: '🔤', category: 'font' },
        { magic: [0x01, 0x00, 0x04, 0x00], type: 'Embedded OpenType (EOT)', mime: 'application/vnd.ms-fontobject', ext: 'eot', icon: '🔤', category: 'font' },

        // ==================== 网页与数据 ====================
        { magic: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], type: 'XML Document', mime: 'application/xml', ext: 'xml', icon: '📝', category: 'data' },
        { magic: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74, 0x6D, 0x6C], type: 'HTML Document', mime: 'text/html', ext: 'html', icon: '🌐', category: 'data' },
        { magic: [0x3C, 0x68, 0x74, 0x6D, 0x6C], type: 'HTML Document', mime: 'text/html', ext: 'html', icon: '🌐', category: 'data' },
        { magic: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45], type: 'HTML5 Document', mime: 'text/html', ext: 'html', icon: '🌐', category: 'data' },
        { magic: [0x7B], type: 'JSON Data', mime: 'application/json', ext: 'json', icon: '📋', category: 'data', check: (bytes) => {
            // Simple check: starts with { and is valid ASCII/UTF-8
            try {
                const str = new TextDecoder().decode(bytes.slice(0, 100));
                return str.trim().startsWith('{') || str.trim().startsWith('[');
            } catch { return false; }
        }},
        { magic: [0x5B], type: 'JSON Array', mime: 'application/json', ext: 'json', icon: '📋', category: 'data', check: (bytes) => {
            try {
                const str = new TextDecoder().decode(bytes.slice(0, 100));
                return str.trim().startsWith('[');
            } catch { return false; }
        }},

        // ==================== 协议与网络 ====================
        { magic: [0x0A, 0x0D, 0x0D, 0x0A], type: 'PCAPNG Capture', mime: 'application/x-pcapng', ext: 'pcapng', icon: '🌐', category: 'network' },
        { magic: [0xD4, 0xC3, 0xB2, 0xA1], type: 'PCAP Capture (LE)', mime: 'application/vnd.tcpdump.pcap', ext: 'pcap', icon: '🌐', category: 'network' },
        { magic: [0xA1, 0xB2, 0xC3, 0xD4], type: 'PCAP Capture (BE)', mime: 'application/vnd.tcpdump.pcap', ext: 'pcap', icon: '🌐', category: 'network' },
        { magic: [0x4D, 0x4D, 0x4D, 0x4D, 0x00, 0x00, 0x00], type: 'Charles Proxy Session', mime: 'application/x-charles', ext: 'chls', icon: '🌐', category: 'network' },

        // ==================== 3D 与 CAD ====================
        { magic: [0x67, 0x6C, 0x54, 0x46], type: 'glTF 3D Model', mime: 'model/gltf-binary', ext: 'glb', icon: '🎨', category: '3d' },
        { magic: [0x23, 0x20, 0x57, 0x61, 0x76, 0x65, 0x66, 0x72, 0x6F, 0x6E, 0x74], type: 'Wavefront OBJ', mime: 'model/obj', ext: 'obj', icon: '🎨', category: '3d' },
        { magic: [0x73, 0x6F, 0x6C, 0x69, 0x64], type: 'STL 3D (ASCII)', mime: 'model/stl', ext: 'stl', icon: '🎨', category: '3d' },
    ];

    /**
     * 检查当前是否在文件类型工具页面
     */
    function isFileTypeToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/file-type');
    }

    /**
     * 格式化文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 字节数组转 Hex 字符串
     */
    function bytesToHex(bytes, separator = ' ') {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(separator);
    }

    /**
     * 字节数组转可打印 ASCII
     */
    function bytesToAscii(bytes) {
        return Array.from(bytes)
            .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
            .join('');
    }

    /**
     * 检测文件类型
     * @param {Uint8Array} bytes - 文件字节
     * @param {File} file - 文件对象
     * @returns {Object} - 检测结果
     */
    function detectFileType(bytes, file) {
        for (const sig of SIGNATURES) {
            const offset = sig.offset || 0;

            // 检查是否有足够的字节
            if (bytes.length < offset + sig.magic.length) {
                continue;
            }

            // 比较 magic number
            const slice = bytes.slice(offset, offset + sig.magic.length);
            const match = sig.magic.every((byte, i) => slice[i] === byte);

            if (match) {
                // 如果有额外检查函数，执行它
                if (sig.check && !sig.check(bytes, file)) {
                    continue;
                }

                return {
                    type: sig.type,
                    mime: sig.mime,
                    ext: sig.ext,
                    icon: sig.icon,
                    matched: true
                };
            }
        }

        // 未识别
        return {
            type: 'Unknown',
            mime: 'application/octet-stream',
            ext: '',
            icon: '❓',
            matched: false
        };
    }

    /**
     * 显示检测结果
     */
    function displayResult(result, file, bytes) {
        const resultSection = document.getElementById('result-section');
        const resultIcon = document.getElementById('result-icon');
        const resultType = document.getElementById('result-type');
        const resultMime = document.getElementById('result-mime');
        const detailFilename = document.getElementById('detail-filename');
        const detailSize = document.getElementById('detail-size');
        const detailExtension = document.getElementById('detail-extension');
        const detailSuggested = document.getElementById('detail-suggested');
        const magicHex = document.getElementById('magic-hex');
        const magicAscii = document.getElementById('magic-ascii');
        const warningBox = document.getElementById('warning-box');
        const warningText = document.getElementById('warning-text');

        if (resultSection) resultSection.style.display = 'block';
        if (resultIcon) resultIcon.textContent = result.icon;
        if (resultType) resultType.textContent = result.type;
        if (resultMime) resultMime.textContent = result.mime;
        if (detailFilename) detailFilename.textContent = file.name;
        if (detailSize) detailSize.textContent = formatFileSize(file.size);

        // 获取文件扩展名
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        if (detailExtension) detailExtension.textContent = ext || '-';
        if (detailSuggested) detailSuggested.textContent = result.ext || '-';

        // 显示 Magic Number (前 16 字节)
        const magicBytes = bytes.slice(0, Math.min(16, bytes.length));
        if (magicHex) magicHex.textContent = bytesToHex(magicBytes);
        if (magicAscii) magicAscii.textContent = bytesToAscii(magicBytes);

        // 检查扩展名是否匹配
        if (warningBox && warningText) {
            if (result.matched && result.ext && ext && ext !== result.ext) {
                warningBox.style.display = 'flex';
                warningText.textContent = REOT.i18n?.currentLocale === 'en-US' ? `File extension (.${ext}) does not match detected type (.${result.ext})! The file may have been renamed or disguised.` : `文件扩展名 (.${ext}) 与检测到的真实类型 (.${result.ext}) 不匹配！这可能是文件被重命名或伪装。`;
            } else if (!result.matched) {
                warningBox.style.display = 'flex';
                warningText.textContent = REOT.i18n?.t('tools.file-type.unknownType') || '无法识别此文件类型。文件可能是纯文本、损坏的二进制文件或不在支持列表中的格式。';
            } else {
                warningBox.style.display = 'none';
            }
        }
    }

    /**
     * 分类配置
     */
    const CATEGORIES = {
        compression: {
            icon: '📦',
            name: '压缩 / 容器 / 镜像',
            nameEn: 'Compression / Container / Disk Image',
            desc: '解包、嵌套分析、固件镜像、虚拟机',
            descEn: 'Unpacking, nested analysis, firmware, VM images'
        },
        mobile: {
            icon: '📱',
            name: 'Android / iOS / 移动应用',
            nameEn: 'Android / iOS / Mobile Apps',
            desc: 'App 结构分析、DEX/OAT/AOT、游戏逆向',
            descEn: 'App structure, DEX/OAT/AOT, game reverse engineering'
        },
        executable: {
            icon: '⚙️',
            name: '可执行文件 / 二进制',
            nameEn: 'Executable / Binary',
            desc: 'PE/ELF/Mach-O、WASM、Java Class',
            descEn: 'PE/ELF/Mach-O, WASM, Java Class'
        },
        bytecode: {
            icon: '🧠',
            name: '脚本 / 字节码',
            nameEn: 'Script / Bytecode',
            desc: 'Python/Lua 字节码、LLVM Bitcode',
            descEn: 'Python/Lua bytecode, LLVM Bitcode'
        },
        crypto: {
            icon: '🔐',
            name: '安全 / 证书 / 密钥',
            nameEn: 'Security / Certificate / Key',
            desc: '证书解析、加密容器、密钥存储',
            descEn: 'Certificate parsing, encrypted containers, keystores'
        },
        debug: {
            icon: '🔍',
            name: '调试 / 崩溃分析',
            nameEn: 'Debug / Crash Analysis',
            desc: 'PDB 符号、内存转储、崩溃文件',
            descEn: 'PDB symbols, memory dumps, crash files'
        },
        database: {
            icon: '🗄️',
            name: '数据库',
            nameEn: 'Database',
            desc: 'SQLite、LevelDB、Realm',
            descEn: 'SQLite, LevelDB, Realm'
        },
        network: {
            icon: '🌐',
            name: '网络 / 抓包',
            nameEn: 'Network / Packet Capture',
            desc: 'PCAP/PCAPNG、代理会话',
            descEn: 'PCAP/PCAPNG, proxy sessions'
        },
        disk: {
            icon: '💿',
            name: '磁盘镜像 / 固件',
            nameEn: 'Disk Image / Firmware',
            desc: 'ISO、DMG、VHD、VMDK、QCOW2',
            descEn: 'ISO, DMG, VHD, VMDK, QCOW2'
        },
        game: {
            icon: '🎮',
            name: '游戏 / 资源包',
            nameEn: 'Game / Asset Bundle',
            desc: 'Unity、纹理格式、3D 模型',
            descEn: 'Unity, texture formats, 3D models'
        },
        image: {
            icon: '🖼️',
            name: '图片',
            nameEn: 'Image',
            desc: 'JPEG、PNG、WebP、HEIC、AVIF',
            descEn: 'JPEG, PNG, WebP, HEIC, AVIF'
        },
        audio: {
            icon: '🎵',
            name: '音频',
            nameEn: 'Audio',
            desc: 'MP3、FLAC、WAV、OGG',
            descEn: 'MP3, FLAC, WAV, OGG'
        },
        video: {
            icon: '🎬',
            name: '视频',
            nameEn: 'Video',
            desc: 'MP4、MKV、AVI、FLV',
            descEn: 'MP4, MKV, AVI, FLV'
        },
        document: {
            icon: '📄',
            name: '文档',
            nameEn: 'Document',
            desc: 'PDF、Office、EPUB',
            descEn: 'PDF, Office, EPUB'
        },
        font: {
            icon: '🔤',
            name: '字体',
            nameEn: 'Font',
            desc: 'TTF、OTF、WOFF/WOFF2',
            descEn: 'TTF, OTF, WOFF/WOFF2'
        },
        data: {
            icon: '📋',
            name: '数据 / 网页',
            nameEn: 'Data / Web',
            desc: 'JSON、XML、HTML',
            descEn: 'JSON, XML, HTML'
        },
        '3d': {
            icon: '🎨',
            name: '3D 模型',
            nameEn: '3D Model',
            desc: 'glTF、OBJ、STL',
            descEn: 'glTF, OBJ, STL'
        }
    };

    /**
     * 显示支持的文件类型（按分类）
     */
    function displaySupportedTypes() {
        const container = document.getElementById('type-tags');
        if (!container) return;

        // 按分类整理扩展名
        const categoryExtensions = {};
        for (const sig of SIGNATURES) {
            if (!sig.ext || !sig.category) continue;
            if (!categoryExtensions[sig.category]) {
                categoryExtensions[sig.category] = new Set();
            }
            categoryExtensions[sig.category].add(sig.ext);
        }

        // 获取当前语言
        const isEn = REOT.i18n?.getLocale?.()?.startsWith('en') || false;

        // 分类顺序（按逆向工程重要性排序）
        const categoryOrder = [
            'compression', 'mobile', 'executable', 'bytecode',
            'crypto', 'debug', 'network', 'disk', 'database',
            'game', 'image', 'audio', 'video',
            'document', 'font', 'data', '3d'
        ];

        let html = '';
        for (const cat of categoryOrder) {
            const config = CATEGORIES[cat];
            const extensions = categoryExtensions[cat];
            if (!config || !extensions || extensions.size === 0) continue;

            const sortedExts = [...extensions].sort();
            const name = isEn ? config.nameEn : config.name;
            const desc = isEn ? config.descEn : config.desc;

            html += `
                <div class="type-category">
                    <div class="type-category-header">
                        <span class="type-category-icon">${config.icon}</span>
                        <span class="type-category-name">${name}</span>
                        <span class="type-category-count">${sortedExts.length}</span>
                    </div>
                    <div class="type-category-desc">${desc}</div>
                    <div class="type-category-tags">
                        ${sortedExts.map(ext => `<span class="type-tag">.${ext}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        // 统计总数
        const totalTypes = [...new Set(SIGNATURES.map(s => s.ext).filter(Boolean))].length;
        const totalSignatures = SIGNATURES.length;

        html = `
            <div class="type-summary">
                <span class="type-summary-item">
                    <strong>${totalTypes}</strong> ${isEn ? 'file extensions' : '种扩展名'}
                </span>
                <span class="type-summary-divider">|</span>
                <span class="type-summary-item">
                    <strong>${totalSignatures}</strong> ${isEn ? 'signatures' : '个签名规则'}
                </span>
                <span class="type-summary-divider">|</span>
                <span class="type-summary-item">
                    <strong>${categoryOrder.length}</strong> ${isEn ? 'categories' : '个分类'}
                </span>
            </div>
        ` + html;

        container.innerHTML = html;
    }

    /**
     * 清除结果
     */
    function clearResult() {
        const resultSection = document.getElementById('result-section');
        const fileInput = document.getElementById('file-input');

        if (resultSection) resultSection.style.display = 'none';
        if (fileInput) fileInput.value = '';
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isFileTypeToolActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const bytes = new Uint8Array(event.target.result);
                const result = detectFileType(bytes, file);
                displayResult(result, file, bytes);
            };
            // 只读取前 1KB，足够识别大多数文件类型
            reader.readAsArrayBuffer(file.slice(0, 1024));
        }
    });

    // 拖拽处理
    document.addEventListener('dragover', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        }
    });

    document.addEventListener('dragleave', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            uploadArea.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const bytes = new Uint8Array(event.target.result);
                    const result = detectFileType(bytes, file);
                    displayResult(result, file, bytes);
                };
                reader.readAsArrayBuffer(file.slice(0, 1024));
            }
        }
    });

    // 点击事件
    document.addEventListener('click', (e) => {
        if (!isFileTypeToolActive()) return;

        const target = e.target;

        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            clearResult();
        }
    });

    // 初始化
    displaySupportedTypes();

    // 导出工具函数
    window.FileTypeTool = { detectFileType, SIGNATURES };

})();
