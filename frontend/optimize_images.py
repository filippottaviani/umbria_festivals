import os
import glob
from PIL import Image

def optimize_images():
    input_dir = 'pictures'
    output_dir = 'public/hero_bg'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    image_files = glob.glob(os.path.join(input_dir, '*'))
    count = 0
    
    for img_path in image_files:
        try:
            filename = os.path.basename(img_path)
            name, _ = os.path.splitext(filename)
            out_path = os.path.join(output_dir, f"{name}.webp")
            
            # Skip if already optimized
            if os.path.exists(out_path):
                print(f"Skipping {filename}, already optimized.")
                continue
                
            with Image.open(img_path) as img:
                # Convert to RGB if necessary (e.g. if RGBA)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                    
                # Calculate new size while preserving aspect ratio, target width 1920
                target_width = 1920
                if img.width > target_width:
                    w_percent = (target_width / float(img.width))
                    h_size = int((float(img.height) * float(w_percent)))
                    img = img.resize((target_width, h_size), Image.Resampling.LANCZOS)
                
                img.save(out_path, 'webp', quality=80)
                print(f"Optimized {filename} -> {name}.webp")
                count += 1
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
            
    print(f"Finished processing {count} images.")

if __name__ == '__main__':
    optimize_images()
