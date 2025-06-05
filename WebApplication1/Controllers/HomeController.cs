using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;
using WebApplication1.Services;

namespace WebApplication1.Controllers;

public class HomeController : Controller
{
    private readonly UsdaFoodService _usdaFoodService;

    public HomeController(UsdaFoodService usdaFoodService)
    {
        _usdaFoodService = usdaFoodService;
    }

    public IActionResult Index()
    {
        return View();
    }

    [HttpGet]
    public async Task<IActionResult> SearchFoods(string query)
    {
        List<Food> foods = await _usdaFoodService.SearchFoodsAsync(query);
        return Json(foods);
    }
}