using WebApplication1.Services;
using WebApplication1.Models;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Добавляем сервисы
builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient<UsdaFoodService>();
builder.Services.Configure<UsdaApiSettings>(builder.Configuration.GetSection("UsdaApi"));

WebApplication app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();