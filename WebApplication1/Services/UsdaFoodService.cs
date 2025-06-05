using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using WebApplication1.Models;

namespace WebApplication1.Services;

public class UsdaFoodService
{
    // Для запроса в API USDA Food Central
    private readonly HttpClient _httpClient;
    
    // Ключ для доступа в API USDA Food Central, уникальнен
    private readonly string _apiKey;
    
    private readonly IMemoryCache _cache;
    
    private readonly TimeSpan _cacheDuration = TimeSpan.FromHours(24);
    
    // Все возможные нутриенты
    private readonly string[] _relevantNutrients =
    [
        "Calcium", "Iron", "Zinc", 
        "Vitamin A", "Vitamin C", "Vitamin D", 
        "Vitamin E", "Vitamin K", "Vitamin B6",
        "Vitamin B12", "Thiamin", "Riboflavin",
        "Niacin", "Folate", "Magnesium",
        "Phosphorus", "Potassium", "Sodium",
        "Protein", "Fiber", "Carbohydrate",
        "Sugars", "Fat", "Saturated Fat"
    ];

    public UsdaFoodService(HttpClient httpClient, 
        IOptions<UsdaApiSettings> options,
        IMemoryCache cache)
    {
        _httpClient = httpClient;
        _apiKey = options.Value.Key;
        _cache = cache;
        _httpClient.BaseAddress = new Uri("https://api.nal.usda.gov/fdc/v1/");
    }
    
    public async Task<List<Food>> SearchFoodsAsync(string query)
    {
        if (query.Length < 3) 
            return [];
        
        string cacheKey = $"usda_foods_{query.ToLower()}";

        if (_cache.TryGetValue(cacheKey, out List<Food>? cachedFoods)) 
            return cachedFoods ?? [];
        
        UsdaApiResponse? response = await _httpClient.GetFromJsonAsync<UsdaApiResponse>(
            $"foods/search?api_key={_apiKey}&query={query}%20raw&dataType=Foundation");

        cachedFoods = response?.Foods?
            .GroupBy(f => NormalizeFoodName(f.Description))
            .Select(g => CreateFood(g.First()))
            .Where(f => f != null)
            .ToList()!;

        _cache.Set(cacheKey, cachedFoods, _cacheDuration);

        return cachedFoods ?? [];
    }

    private string NormalizeFoodName(string name) => name.Split(',')[0].Replace("raw", "").Replace("  ", " ").Trim().ToLower();
    private Food? CreateFood(UsdaFood usdaFood)
    {
        List<Nutrient>? nutrients = usdaFood.FoodNutrients?
            .Where(n => _relevantNutrients.Any(rn => n.NutrientName.Contains(rn)))
            .Select(n => new Nutrient
            {
                Name = n.NutrientName.Split(',')[0].Trim(),
                Amount = n.Value,
                Unit = n.UnitName
            })
            .ToList();

        if (nutrients == null || nutrients.Count == 0) 
            return null;

        return new Food
        {
            Id = usdaFood.FdcId,
            Name = Capitalize(NormalizeFoodName(usdaFood.Description)),
            Nutrients = nutrients,
            Color = GetColorForFood(usdaFood.Description)
        };
    }
    
    private string Capitalize(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s[1..];

    // Получаем случайные не вырвиглазный цвет для графика
    private string GetColorForFood(string name) => 
        $"hsla({NormalizeFoodName(name).GetHashCode() % 360}, 70%, 65%, 0.7)";
}