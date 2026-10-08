#!/usr/bin/env python3
"""
Builds the game's optional texture set from the "PNG - Pixel Art Textures" pack.

  pip install pillow
  python3 tools/build_textures.py path/to/PNG_-_Pixel_Art_Textures.zip      (or the extracted folder)

Writes textures/*.png + textures/manifest.json. The folder is git-ignored: the pack licence forbids
redistributing it, so every player/developer builds their own copy from their own download.
Without textures/ the game falls back to its generated textures.
"""
import io, json, os, sys, zipfile
from PIL import Image, ImageEnhance

# name -> (source path inside PNGs/, output size, optional brightness)
MAP = {
  # ground (sampled into the terrain canvas)
  'ground_grass_a': ('Grass/Grass_02_Green_1.png', 64, 1.35), 'ground_grass_b': ('Grass/Grass_01_Green_2.png', 64, 1.45),
  'ground_forest': ('Grass/Grass_02_Green_3.png', 64, 1.0), 'ground_sand': ('Sand/Sand_01_Yellow_1.png', 64, 1.0),
  'ground_dirt': ('Dirt/Dirt_Pebbles_02_Brown_1.png', 64, 1.15), 'ground_clay': ('Dirt/Dirt_Rocks_02_Brown_1.png', 64, 1.1),
  'ground_rock': ('Rockface/Rock_Grey_02.png', 64, 0.9), 'ground_pavement': ('Concrete/Concrete_01_Grey_2.png', 64, 1.05),
  'ground_asphalt': ('Concrete/Concrete_01_Grey_5.png', 64, 0.55), 'ground_gravel': ('Gravel/Gravel_01_Grey_1.png', 64, 1.0),
  'water': ('Water/Water_01_Blue_2.png', 128, 0.95),
  # walls (one 4 m x one storey tile)
  'wall_brick': ('Bricks/Bricks/Bricks_01_Orange_1.png', 64, 1.0), 'wall_brick_red': ('Bricks/Bricks/Bricks_03_Red_2.png', 64, 1.0),
  'wall_grey': ('Bricks/Bricks/Bricks_02_Grey_2.png', 64, 1.05), 'wall_tan': ('Bricks/Bricks/Bricks_04_Yellow_2_1.png', 64, 1.0),
  'wall_civic': ('Bricks/Bricks/Bricks_04_Yellow_3.png', 64, 1.0), 'wall_stone': ('Stones/Stones_Loose_01_Grey_1.png', 64, 1.05),
  'wall_planks': ('Wood/Wood_Planks_01_Brown_2.png', 64, 1.0), 'wall_logs': ('Wood/Wood_Planks_01_Brown_3.png', 64, 0.9),
  'wall_stucco': ('Wall/Wall_01_Stucco_Grey_3.png', 64, 1.25), 'wall_white': ('Wall/Wall_01_Stucco_Grey_2.png', 64, 1.35),
  'wall_industrial': ('Bricks/Bricks/Bricks_05_Brown_2.png', 64, 1.0),
  # roofs
  'roof_tiles_red': ('Roofing/Roof_Tiles_01_Red_1.png', 64, 1.5), 'roof_tiles_grey': ('Roofing/Roof_Tiles_01_Grey_1.png', 64, 1.35),
  'roof_tiles_blue': ('Roofing/Roof_Tiles_01_Blue_1.png', 64, 1.4), 'roof_thatch': ('Wood/Wood_Pattern_01_Yellow_1.png', 64, 0.95),
  'roof_gravel': ('Gravel/Gravel_01_Grey_1.png', 64, 0.9),
  # nature
  # interior floors (1 tile = 4 m) and wall lining (1 tile = 3 m)
  'floor_wood': ('Wood/Wood_Planks_01_Brown_1.png', 64, 1.1), 'floor_wood_dark': ('Wood/Wood_Planks_01_Brown_4.png', 64, 0.95),
  'floor_tile': ('Tiles/Tiles Rectangle/Tiles_Rectangle_01_White_1.png', 64, 1.05), 'floor_tile_grey': ('Tiles/Tiles Rectangle/Tiles_Rectangle_01_Grey_1.png', 64, 1.0),
  'floor_carpet_red': ('Patterns/Pattern_01_Retro_Carpet_Red_1.png', 64, 1.0), 'floor_carpet_green': ('Patterns/Pattern_01_Retro_Carpet_Green_1.png', 64, 1.0),
  'int_wallpaper_red': ('Wall/Wallpaper_01_Red_1.png', 64, 1.05), 'int_wallpaper_green': ('Wall/Wallpaper_03_Green_1.png', 64, 1.05),
  'int_wallpaper_white': ('Wall/Wallpaper_02_White_1.png', 64, 1.1), 'int_wallpaper_blue': ('Wall/Pattern_02_BlueWhite_Wallpaper_1.png', 64, 1.05),
  'int_paint_yellow': ('Painted Wall/Painted_Wall_01_Yellow_1.png', 64, 1.1), 'int_paint_green': ('Painted Wall/Painted_Wall_01_Green_1.png', 64, 1.1),
  'int_paint_grey': ('Painted Wall/Painted_Wall_01_Grey_1.png', 64, 1.1), 'int_paint_blue': ('Painted Wall/Painted_Wall_01_Blue_1.png', 64, 1.1),
  'int_stucco': ('Wall/Wall_01_Stucco_Yellow_1.png', 64, 1.1), 'int_planks': ('Wood/Wood_Planks_01_Brown_2.png', 64, 0.95),
  'bark': ('Wood/Wood_Bark_01.png', 32, 1.0), 'leaves': ('Foliage/Foliage_Leaves_01_Green_1.png', 32, 1.2), 'rock': ('Rockface/Rock_Grey_01.png', 64, 1.0),
}
# fabrics/wood are stored as soft greyscale so the game can tint them with any colour (clothes, upholstery, furniture)
GREY = {'fab_plaid': 'Fabric/Fabric_Plaid_01_Red_1.png', 'fab_gingham': 'Fabric/Fabric_Gingam_01_Blue_1.png', 'fab_cord': 'Fabric/Fabric_Corduroy_01_Brown_1.png',
        'fab_hound': 'Fabric/Fabric_Houndstooth_01_BlackWhite_1.png', 'fab_diamond': 'Fabric/Fabric_Diamond_01_Blue_1.png', 'fab_padded': 'Fabric/Fabric_Padded_02_Grey_1.png',
        'fab_plain': 'Fabric/Fabric_Plain_01_Grey_3.png', 'fab_wood': 'Wood/Wood_Planks_01_Brown_2.png'}
# windows keep their transparency and are trimmed to the visible frame
TRIM = {'win_modern': ('Windows/Window 04/Window_04_Double_1.png', 48), 'win_old': ('Windows/Window 02/Window_Old_Single_1.png', 48), 'door_blue': ('Doors/Door Wood 01/Door_Wood_Blue_1.png', 48), 'door_green': ('Doors/Door Wood 01/Door_Wood_Green_1.png', 48)}

def opener(src):
    if os.path.isdir(src):
        def op(rel):
            for root in (os.path.join(src, 'PNGs'), src):
                p = os.path.join(root, rel)
                if os.path.exists(p): return Image.open(p)
            raise FileNotFoundError(rel)
        return op
    z = zipfile.ZipFile(src); names = {n.replace('\\', '/'): n for n in z.namelist()}
    def op(rel):
        for n in names:
            if n.endswith('PNGs/' + rel) or n == rel: return Image.open(io.BytesIO(z.read(names[n])))
        raise FileNotFoundError(rel)
    return op

def main():
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    op = opener(sys.argv[1]); out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'textures'); os.makedirs(out, exist_ok=True)
    manifest = {}
    for name, (rel, size, bright) in MAP.items():
        try: im = op(rel).convert('RGBA')
        except Exception as e: print('missing', rel); continue
        im = im.resize((size, size), Image.BOX).convert('RGB')
        if bright != 1.0: im = ImageEnhance.Brightness(im).enhance(bright)
        im.save(os.path.join(out, name + '.png')); manifest[name] = name + '.png'
    for name, rel in GREY.items():
        try: im = op(rel).convert('L')
        except Exception as e: print('missing', rel); continue
        im = im.resize((32, 32), Image.BOX); px = list(im.getdata()); mean = sum(px) / len(px)
        im = im.point(lambda v: max(0, min(255, int(222 + (v - mean) * 0.75)))).convert('RGB')
        im.save(os.path.join(out, name + '.png')); manifest[name] = name + '.png'
    for name, (rel, size) in TRIM.items():
        try: im = op(rel).convert('RGBA')
        except Exception as e: print('missing', rel); continue
        bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
        if bb: im = im.crop(bb)
        h = max(8, round(size * im.height / im.width)); im = im.resize((size, h), Image.BOX); im.save(os.path.join(out, name + '.png')); manifest[name] = name + '.png'
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
    print('wrote', len(manifest), 'textures to', os.path.abspath(out))
main()
