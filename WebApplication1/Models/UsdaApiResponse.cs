using System.Text.Json.Serialization;

namespace WebApplication1.Models;

public class UsdaApiResponse
{
    [JsonPropertyName("foods")]
    public List<UsdaFood> Foods { get; set; }
}

public class UsdaFood
{
    [JsonPropertyName("fdcId")]
    public int FdcId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; }

    [JsonPropertyName("foodNutrients")]
    public List<UsdaNutrient> FoodNutrients { get; set; }
}

public class UsdaNutrient
{
    [JsonPropertyName("nutrientId")] public int NutrientId { get; set; }

    [JsonPropertyName("nutrientName")] public string NutrientName { get; set; }

    [JsonPropertyName("value")] public double Value { get; set; }

    [JsonPropertyName("unitName")] public string UnitName { get; set; }
}