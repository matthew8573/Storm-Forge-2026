using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Domain.Entities;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/[controller]")]
public class DriversController : ControllerBase
{
    private readonly IAppDbContext _context;

    public DriversController(IAppDbContext context)
    {
        _context = context;
    }

    // GET /api/v1/drivers?include_inactive=false
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool include_inactive = false)
    {
        var query = _context.Drivers.AsQueryable();
        if (!include_inactive)
            query = query.Where(d => d.IsActive);

        var drivers = await query
            .Select(d => new DriverDto
            {
                DriverId = d.DriverId,
                Name = d.Name,
                Phone = d.Phone,
                IsActive = d.IsActive
            })
            .ToListAsync();

        return Ok(drivers);
    }

    // GET /api/v1/drivers/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var driver = await _context.Drivers
            .Where(d => d.DriverId == id)
            .Select(d => new DriverDto
            {
                DriverId = d.DriverId,
                Name = d.Name,
                Phone = d.Phone,
                IsActive = d.IsActive
            })
            .FirstOrDefaultAsync();

        if (driver == null)
            return NotFound();

        return Ok(driver);
    }

    // POST /api/v1/drivers
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDriverDto dto)
    {
        var driver = new Driver
        {
            Name = dto.Name,
            Phone = dto.Phone,
            IsActive = true
        };

        _context.Drivers.Add(driver);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = driver.DriverId }, new DriverDto
        {
            DriverId = driver.DriverId,
            Name = driver.Name,
            Phone = driver.Phone,
            IsActive = driver.IsActive
        });
    }

    // PUT /api/v1/drivers/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDriverDto dto)
    {
        var driver = await _context.Drivers.FindAsync(id);
        if (driver == null)
            return NotFound();

        driver.Name = dto.Name;
        driver.Phone = dto.Phone;
        driver.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new DriverDto
        {
            DriverId = driver.DriverId,
            Name = driver.Name,
            Phone = driver.Phone,
            IsActive = driver.IsActive
        });
    }

    // DELETE /api/v1/drivers/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var driver = await _context.Drivers.FindAsync(id);
        if (driver == null)
            return NotFound();

        bool hasOrders = await _context.Orders.AnyAsync(o => o.DriverId == id);
        if (hasOrders)
            return Conflict(new { message = "Cannot delete driver with existing orders. Deactivate instead.", code = "HAS_ORDERS" });

        _context.Drivers.Remove(driver);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
