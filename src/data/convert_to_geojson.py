import geopandas as gpd

try:
    # Update the filename to match your actual tract shapefile
    shapefile = "tl_2024_17_tract.shp"
    print(f"Reading {shapefile}...")

    gdf = gpd.read_file(shapefile)

    # Write to GeoJSON
    output_file = "il_tracts.geojson"
    gdf.to_file(output_file, driver="GeoJSON")

    print(f"✅ Success! GeoJSON written to {output_file}")

except Exception as e:
    print(f"❌ Error: {e}")
