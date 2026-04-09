import os
import glob
import shutil

brain_dir = r"C:\Users\grifo\.gemini\antigravity\brain\e9671e54-9947-488a-b9bf-36305e47a553"
dest_dir = r"c:\Users\grifo\OneDrive\AI\VibeVoding\WW2\images"

prefix_map = {
    "ch03_depression": "ch03-depression.jpg",
    "ch03_russian": "ch03-russian-revolution.jpg",
    "ch03_fascist": "ch03-fascist-italy.jpg",
    "ch03_nazi_germany": "ch03-nazi-germany.jpg",
    "ch03_europe_map": "ch03-europe-map.jpg",
    "ch03_axis": "ch03-axis-powers.jpg",
    "ch03_blitzkrieg": "ch03-blitzkrieg.jpg",
    "ch03_pearl_harbor": "ch03-pearl-harbor.jpg",
    "ch03_normandy": "ch03-normandy.jpg",
    "ch03_japan_surrender": "ch03-japan-surrender.jpg",
    "ch03_united_nations": "ch03-united-nations.jpg"
}

# Find newest files for each prefix
for prefix, target_name in prefix_map.items():
    search_pattern = os.path.join(brain_dir, f"{prefix}_*.png")
    files = glob.glob(search_pattern)
    if files:
        newest_file = max(files, key=os.path.getmtime)
        dest_path = os.path.join(dest_dir, target_name)
        shutil.copy2(newest_file, dest_path)
        print(f"Copied {os.path.basename(newest_file)} to {target_name}")
    else:
        print(f"Warning: No file found for {prefix}")

