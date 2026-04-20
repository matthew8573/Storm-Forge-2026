using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IAppDbContext _context;

    public ProductsController(IAppDbContext context)
    {
        _context = context;
    }

    // GET /api/v1/products
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await _context.Products
            .Where(p => p.IsActive)
            .Select(p => new ProductDto
            {
                ProductId = p.ProductId,
                Name = p.Name,
                IsActive = p.IsActive
            })
            .ToListAsync();

        return Ok(products);
    }
}
