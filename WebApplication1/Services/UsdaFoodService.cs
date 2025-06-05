using Microsoft.Extensions.Options;
using WebApplication1.Models;

namespace WebApplication1.Services;

public class UsdaFoodService
{
    // Для запроса в API USDA Food Central
    private readonly HttpClient _httpClient;
    
    // Ключ для доступа в API USDA Food Central, уникальнен
    private readonly string _apiKey;
    
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

    public UsdaFoodService(HttpClient httpClient, IOptions<UsdaApiSettings> options)
    {
        _httpClient = httpClient;
        _apiKey = options.Value.Key;
        _httpClient.BaseAddress = new Uri("https://api.nal.usda.gov/fdc/v1/");
    }
    
    public async Task<List<Food>> SearchFoodsAsync(string query)
    {
        // Обращение с фильтрами по Foundation Foods (лишь сырая пища) + обязательное условие raw (не приготовленная, только свежая)
        UsdaApiResponse? response = await _httpClient.GetFromJsonAsync<UsdaApiResponse>(
            $"foods/search?api_key={_apiKey}&query={query}%20raw&dataType=Foundation");

        if (response?.Foods == null) 
            return [];

        // Группировка по нормализованным названиям, так как в базе данных присутствуют разделения даже по принципу с кожурой/без кожуры
        List<Food> normalizedFoods = response.Foods
            .GroupBy(f => NormalizeFoodName(f.Description))
            .Select(g => CreateFood(g.First()))
            .Where(f => f != null)
            .ToList()!;

        return normalizedFoods;
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