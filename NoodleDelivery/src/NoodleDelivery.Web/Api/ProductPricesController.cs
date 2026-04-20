using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Domain.Entities;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/products/{productId}/prices")]
public class ProductPricesController : ControllerBase
{
    private readonly IAppDbContext _context;

    public ProductPricesController(IAppDbContext context)
    {
        _context = context;
    }

    // GET /api/v1/products/{productId}/prices
    [HttpGet]
    public async Task<IActionResult> GetAll(int productId)
    {
        var productExists = await _context.Products.AnyAsync(p => p.ProductId == productId);
        if (!productExists)
            return NotFound();

        var prices = await _context.ProductPrices
            .Where(pp => pp.ProductId == productId)
            .OrderByDescending(pp => pp.EffectiveFrom)
            .Select(pp => new ProductPriceDto
            {
                PriceId = pp.PriceId,
                ProductId = pp.ProductId,
                UnitPrice = pp.UnitPrice,
                EffectiveFrom = pp.EffectiveFrom
            })
            .ToListAsync();

        return Ok(prices);
    }

    // GET /api/v1/products/{productId}/prices/effective?date=YYYY-MM-DD
    [HttpGet("effective")]
    public async Task<IActionResult> GetEffective(int productId, [FromQuery] string? date)
    {
        if (string.IsNullOrWhiteSpace(date))
            return BadRequest(new { message = "date query parameter is required." });

        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(new { message = "Invalid date format. Use YYYY-MM-DD." });

        var productExists = await _context.Products.AnyAsync(p => p.ProductId == productId);
        if (!productExists)
            return NotFound();

        // MAX(effective_from) WHERE effective_from <= date AND product_id = productId
        var maxEffectiveFrom = await _context.ProductPrices
            .Where(pp => pp.ProductId == productId && pp.EffectiveFrom <= parsedDate)
            .MaxAsync(pp => (DateOnly?)pp.EffectiveFrom);

        if (maxEffectiveFrom == null)
            return NotFound(new { message = $"No price found for product {productId} on or before {date}." });

        var price = await _context.ProductPrices
            .Where(pp => pp.ProductId == productId && pp.EffectiveFrom == maxEffectiveFrom)
            .Select(pp => new ProductPriceDto
            {
                PriceId = pp.PriceId,
                ProductId = pp.ProductId,
                UnitPrice = pp.UnitPrice,
                EffectiveFrom = pp.EffectiveFrom
            })
            .FirstOrDefaultAsync();

        if (price == null)
            return NotFound();

        return Ok(price);
    }

    // POST /api/v1/products/{productId}/prices
    [HttpPost]
    public async Task<IActionResult> Create(int productId, [FromBody] CreateProductPriceDto dto)
    {
        var productExists = await _context.Products.AnyAsync(p => p.ProductId == productId);
        if (!productExists)
            return NotFound();

        var price = new ProductPrice
        {
            ProductId = productId,
            UnitPrice = dto.UnitPrice,
            EffectiveFrom = dto.EffectiveFrom
        };

        _context.ProductPrices.Add(price);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { productId }, new ProductPriceDto
        {
            PriceId = price.PriceId,
            ProductId = price.ProductId,
            UnitPrice = price.UnitPrice,
            EffectiveFrom = price.EffectiveFrom
        });
    }

    // PUT /api/v1/products/{productId}/prices/{priceId}
    [HttpPut("{priceId}")]
    public async Task<IActionResult> Update(int productId, int priceId, [FromBody] UpdateProductPriceDto dto)
    {
        var price = await _context.ProductPrices
            .FirstOrDefaultAsync(pp => pp.PriceId == priceId && pp.ProductId == productId);

        if (price == null)
            return NotFound();

        price.UnitPrice = dto.UnitPrice;
        price.EffectiveFrom = dto.EffectiveFrom;

        await _context.SaveChangesAsync();

        return Ok(new ProductPriceDto
        {
            PriceId = price.PriceId,
            ProductId = price.ProductId,
            UnitPrice = price.UnitPrice,
            EffectiveFrom = price.EffectiveFrom
        });
    }
}
