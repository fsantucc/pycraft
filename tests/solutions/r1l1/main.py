forge_name = "Forge du Val"
iron_ingots = 12
coal_ratio = 0.5
is_open = True

coal_needed = iron_ingots * coal_ratio
print(f"{forge_name} : {coal_needed} charbon nécessaire")

iron_ingots = iron_ingots + 5
coal_needed = iron_ingots * coal_ratio
print(f"Après livraison : {coal_needed} charbon nécessaire")
