using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Domain.Entities;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/[controller]")]
public class RestaurantsController : ControllerBase
{
    private readonly IAppDbContext _context;

    public RestaurantsController(IAppDbContext context)
    {
        _context = context;
    }

    // GET /api/v1/restaurants?include_inactive=false
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool include_inactive = false)
    {
        var query = _context.Restaurants.AsQueryable();
        if (!include_inactive)
            query = query.Where(r => r.IsActive);

        var restaurants = await query
            .Select(r => new RestaurantDto
            {
                RestaurantId = r.RestaurantId,
                Name = r.Name,
                Address = r.Address,
                Phone = r.Phone,
                IsActive = r.IsActive
            })
            .ToListAsync();

        return Ok(restaurants);
    }

    // GET /api/v1/restaurants/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var restaurant = await _context.Restaurants
            .Where(r => r.RestaurantId == id)
            .Select(r => new RestaurantDto
            {
                RestaurantId = r.RestaurantId,
                Name = r.Name,
                Address = r.Address,
                Phone = r.Phone,
                IsActive = r.IsActive
            })
            .FirstOrDefaultAsync();

        if (restaurant == null)
            return NotFound();

        return Ok(restaurant);
    }

    // POST /api/v1/restaurants
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRestaurantDto dto)
    {
        var restaurant = new Restaurant
        {
            Name = dto.Name,
            Address = dto.Address,
            Phone = dto.Phone,
            IsActive = true
        };

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = restaurant.RestaurantId }, new RestaurantDto
        {
            RestaurantId = restaurant.RestaurantId,
            Name = restaurant.Name,
            Address = restaurant.Address,
            Phone = restaurant.Phone,
            IsActive = restaurant.IsActive
        });
    }

    // PUT /api/v1/restaurants/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRestaurantDto dto)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null)
            return NotFound();

        restaurant.Name = dto.Name;
        restaurant.Address = dto.Address;
        restaurant.Phone = dto.Phone;
        restaurant.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new RestaurantDto
        {
            RestaurantId = restaurant.RestaurantId,
            Name = restaurant.Name,
            Address = restaurant.Address,
            Phone = restaurant.Phone,
            IsActive = restaurant.IsActive
        });
    }

    // DELETE /api/v1/restaurants/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null)
            return NotFound();

        bool hasOrders = await _context.Orders.AnyAsync(o => o.RestaurantId == id);
        if (hasOrders)
            return Conflict(new { message = "Cannot delete restaurant with existing orders. Deactivate instead.", code = "HAS_ORDERS" });

        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
