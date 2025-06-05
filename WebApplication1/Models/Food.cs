namespace WebApplication1.Models;

public class Food
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Nutrient> Nutrients { get; set; } = new();
    public string Color { get; set; } // HEX-цвет для графика
}