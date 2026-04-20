using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAppDbContext _context;

    public AnalyticsController(IAppDbContext context)
    {
        _context = context;
    }

    private (DateOnly from, DateOnly to, IActionResult? error) ParseDateRange(string? fromStr, string? toStr)
    {
        if (string.IsNullOrWhiteSpace(fromStr) || string.IsNullOrWhiteSpace(toStr))
            return (default, default, BadRequest(new { message = "Both 'from' and 'to' query parameters are required (YYYY-MM-DD)." }));

        if (!DateOnly.TryParse(fromStr, out var from))
            return (default, default, BadRequest(new { message = "Invalid 'from' date format. Use YYYY-MM-DD." }));

        if (!DateOnly.TryParse(toStr, out var to))
            return (default, default, BadRequest(new { message = "Invalid 'to' date format. Use YYYY-MM-DD." }));

        return (from, to, null);
    }

    // GET /api/v1/analytics/summary?from=&to=
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] string? from, [FromQuery] string? to)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        // Fetch grouped data: product, kg, revenue per order item within date range
        var rows = await _context.OrderItems
            .Include(i => i.Product)
            .Include(i => i.Order)
            .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate)
            .Select(i => new
            {
                ProductName = i.Product.Name,
                i.QuantityKg,
                i.LineTotal,
                i.Order.RestaurantId,
                RestaurantName = i.Order.Restaurant.Name,
                i.Order.DriverId,
                DriverName = i.Order.Driver.Name
            })
            .ToListAsync();

        var totalKgByProduct = rows
            .GroupBy(r => r.ProductName)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.QuantityKg));

        var totalRevenue = rows.Sum(r => r.LineTotal);

        // Top restaurant by revenue
        var restaurantRevenue = rows
            .GroupBy(r => new { r.RestaurantId, r.RestaurantName })
            .Select(g => new { g.Key.RestaurantId, g.Key.RestaurantName, Revenue = g.Sum(r => r.LineTotal) })
            .OrderByDescending(r => r.Revenue)
            .FirstOrDefault();

        // Top driver by revenue
        var driverRevenue = rows
            .GroupBy(r => new { r.DriverId, r.DriverName })
            .Select(g => new { g.Key.DriverId, g.Key.DriverName, Revenue = g.Sum(r => r.LineTotal) })
            .OrderByDescending(r => r.Revenue)
            .FirstOrDefault();

        return Ok(new AnalyticsSummaryDto
        {
            TotalKgByProduct = totalKgByProduct,
            TotalRevenue = totalRevenue,
            TopRestaurant = restaurantRevenue == null ? null : new TopEntityDto
            {
                Id = restaurantRevenue.RestaurantId,
                Name = restaurantRevenue.RestaurantName,
                Revenue = restaurantRevenue.Revenue
            },
            TopDriver = driverRevenue == null ? null : new TopEntityDto
            {
                Id = driverRevenue.DriverId,
                Name = driverRevenue.DriverName,
                Revenue = driverRevenue.Revenue
            }
        });
    }

    // GET /api/v1/analytics/top-restaurants?from=&to=&limit=5
    [HttpGet("top-restaurants")]
    public async Task<IActionResult> TopRestaurants(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int limit = 5)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        var rows = await _context.OrderItems
            .Include(i => i.Product)
            .Include(i => i.Order)
            .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate)
            .Select(i => new
            {
                ProductName = i.Product.Name,
                i.QuantityKg,
                i.LineTotal,
                i.Order.RestaurantId,
                RestaurantName = i.Order.Restaurant.Name
            })
            .ToListAsync();

        var result = rows
            .GroupBy(r => new { r.RestaurantId, r.RestaurantName })
            .Select(g => new TopRestaurantAnalyticsDto
            {
                RestaurantId = g.Key.RestaurantId,
                Name = g.Key.RestaurantName,
                Revenue = g.Sum(r => r.LineTotal),
                KgByProduct = g.GroupBy(r => r.ProductName)
                               .ToDictionary(pg => pg.Key, pg => pg.Sum(r => r.QuantityKg))
            })
            .OrderByDescending(r => r.Revenue)
            .Take(limit)
            .ToList();

        return Ok(result);
    }

    // GET /api/v1/analytics/top-drivers?from=&to=&limit=5
    [HttpGet("top-drivers")]
    public async Task<IActionResult> TopDrivers(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int limit = 5)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        var rows = await _context.OrderItems
            .Include(i => i.Product)
            .Include(i => i.Order)
            .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate)
            .Select(i => new
            {
                ProductName = i.Product.Name,
                i.QuantityKg,
                i.LineTotal,
                i.Order.DriverId,
                DriverName = i.Order.Driver.Name
            })
            .ToListAsync();

        var result = rows
            .GroupBy(r => new { r.DriverId, r.DriverName })
            .Select(g => new TopDriverAnalyticsDto
            {
                DriverId = g.Key.DriverId,
                Name = g.Key.DriverName,
                Revenue = g.Sum(r => r.LineTotal),
                KgByProduct = g.GroupBy(r => r.ProductName)
                               .ToDictionary(pg => pg.Key, pg => pg.Sum(r => r.QuantityKg))
            })
            .OrderByDescending(d => d.Revenue)
            .Take(limit)
            .ToList();

        return Ok(result);
    }

    // GET /api/v1/analytics/over-time?from=&to=
    [HttpGet("over-time")]
    public async Task<IActionResult> OverTime([FromQuery] string? from, [FromQuery] string? to)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        var rows = await _context.OrderItems
            .Include(i => i.Product)
            .Include(i => i.Order)
            .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate)
            .Select(i => new
            {
                Date = i.Order.Date,
                ProductName = i.Product.Name,
                i.QuantityKg,
                i.LineTotal
            })
            .ToListAsync();

        var result = rows
            .GroupBy(r => r.Date)
            .OrderBy(g => g.Key)
            .Select(g => new OverTimeDto
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Revenue = g.Sum(r => r.LineTotal),
                KgByProduct = g.GroupBy(r => r.ProductName)
                               .ToDictionary(pg => pg.Key, pg => pg.Sum(r => r.QuantityKg))
            })
            .ToList();

        return Ok(result);
    }

    // GET /api/v1/analytics/restaurant-contribution?from=&to=
    [HttpGet("restaurant-contribution")]
    public async Task<IActionResult> RestaurantContribution([FromQuery] string? from, [FromQuery] string? to)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        var rows = await _context.OrderItems
            .Include(i => i.Order)
            .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate)
            .Select(i => new
            {
                i.Order.RestaurantId,
                RestaurantName = i.Order.Restaurant.Name,
                i.LineTotal
            })
            .ToListAsync();

        var totalRevenue = rows.Sum(r => r.LineTotal);

        var result = rows
            .GroupBy(r => new { r.RestaurantId, r.RestaurantName })
            .Select(g => new RestaurantContributionDto
            {
                RestaurantId = g.Key.RestaurantId,
                Name = g.Key.RestaurantName,
                Revenue = g.Sum(r => r.LineTotal),
                SharePercent = totalRevenue == 0 ? 0 : Math.Round(g.Sum(r => r.LineTotal) / totalRevenue * 100, 2)
            })
            .OrderByDescending(r => r.Revenue)
            .ToList();

        return Ok(result);
    }

    // GET /api/v1/analytics/entity?type=driver|restaurant&id=&from=&to=
    [HttpGet("entity")]
    public async Task<IActionResult> Entity(
        [FromQuery] string? type,
        [FromQuery] int? id,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var (fromDate, toDate, error) = ParseDateRange(from, to);
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(type) || id == null)
            return BadRequest(new { message = "'type' (driver|restaurant) and 'id' are required." });

        type = type.ToLowerInvariant();
        if (type != "driver" && type != "restaurant")
            return BadRequest(new { message = "'type' must be 'driver' or 'restaurant'." });

        string entityName;
        List<dynamic> rows;

        if (type == "driver")
        {
            var driver = await _context.Drivers.FindAsync(id.Value);
            if (driver == null) return NotFound();
            entityName = driver.Name;

            var rawRows = await _context.OrderItems
                .Include(i => i.Product)
                .Include(i => i.Order)
                .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate && i.Order.DriverId == id.Value)
                .Select(i => new
                {
                    Date = i.Order.Date,
                    ProductName = i.Product.Name,
                    i.QuantityKg,
                    i.LineTotal
                })
                .ToListAsync();

            rows = rawRows.Cast<dynamic>().ToList();
        }
        else
        {
            var restaurant = await _context.Restaurants.FindAsync(id.Value);
            if (restaurant == null) return NotFound();
            entityName = restaurant.Name;

            var rawRows = await _context.OrderItems
                .Include(i => i.Product)
                .Include(i => i.Order)
                .Where(i => i.Order.Date >= fromDate && i.Order.Date <= toDate && i.Order.RestaurantId == id.Value)
                .Select(i => new
                {
                    Date = i.Order.Date,
                    ProductName = i.Product.Name,
                    i.QuantityKg,
                    i.LineTotal
                })
                .ToListAsync();

            rows = rawRows.Cast<dynamic>().ToList();
        }

        // Build result using concrete types to avoid dynamic issues
        var concreteRows = rows.Select(r => new
        {
            Date = (DateOnly)r.Date,
            ProductName = (string)r.ProductName,
            QuantityKg = (decimal)r.QuantityKg,
            LineTotal = (decimal)r.LineTotal
        }).ToList();

        var totalKgByProduct = concreteRows
            .GroupBy(r => r.ProductName)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.QuantityKg));

        var totalRevenue = concreteRows.Sum(r => r.LineTotal);

        var dailyBreakdown = concreteRows
            .GroupBy(r => r.Date)
            .OrderBy(g => g.Key)
            .Select(g => new OverTimeDto
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Revenue = g.Sum(r => r.LineTotal),
                KgByProduct = g.GroupBy(r => r.ProductName)
                               .ToDictionary(pg => pg.Key, pg => pg.Sum(r => r.QuantityKg))
            })
            .ToList();

        return Ok(new EntityAnalyticsDto
        {
            EntityType = type,
            Id = id.Value,
            Name = entityName,
            TotalKgByProduct = totalKgByProduct,
            TotalRevenue = totalRevenue,
            DailyBreakdown = dailyBreakdown
        });
    }
}
