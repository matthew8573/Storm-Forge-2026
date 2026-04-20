using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoodleDelivery.Application.Common.Interfaces;
using NoodleDelivery.Domain.Entities;
using NoodleDelivery.Web.Api.Dtos;

namespace NoodleDelivery.Web.Api;

[ApiController]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IAppDbContext _context;

    public OrdersController(IAppDbContext context)
    {
        _context = context;
    }

    private static OrderDto MapOrder(Order o) => new()
    {
        OrderId = o.OrderId,
        Date = o.Date,
        DriverId = o.DriverId,
        DriverName = o.Driver?.Name ?? string.Empty,
        RestaurantId = o.RestaurantId,
        RestaurantName = o.Restaurant?.Name ?? string.Empty,
        Items = o.Items.Select(i => new OrderItemDto
        {
            OrderItemId = i.OrderItemId,
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? string.Empty,
            QuantityKg = i.QuantityKg,
            UnitPrice = i.UnitPrice,
            LineTotal = i.LineTotal
        }).ToList()
    };

    // GET /api/v1/orders?date=&from=&to=&driver_id=&restaurant_id=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? date,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int? driver_id,
        [FromQuery] int? restaurant_id)
    {
        var query = _context.Orders
            .Include(o => o.Driver)
            .Include(o => o.Restaurant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsedDate))
            query = query.Where(o => o.Date == parsedDate);

        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var parsedFrom))
            query = query.Where(o => o.Date >= parsedFrom);

        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var parsedTo))
            query = query.Where(o => o.Date <= parsedTo);

        if (driver_id.HasValue)
            query = query.Where(o => o.DriverId == driver_id.Value);

        if (restaurant_id.HasValue)
            query = query.Where(o => o.RestaurantId == restaurant_id.Value);

        var orders = await query.ToListAsync();
        return Ok(orders.Select(MapOrder));
    }

    // GET /api/v1/orders/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Driver)
            .Include(o => o.Restaurant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null)
            return NotFound();

        return Ok(MapOrder(order));
    }

    // POST /api/v1/orders/batch
    [HttpPost("batch")]
    public async Task<IActionResult> BatchCreate([FromBody] BatchOrderRequest request)
    {
        // Step 1: Drop items where quantity_kg == 0, drop orders where all items are zero/empty
        var filteredOrders = request.Orders
            .Select(o => new BatchOrderEntry
            {
                DriverId = o.DriverId,
                RestaurantId = o.RestaurantId,
                Items = o.Items.Where(i => i.QuantityKg != 0).ToList()
            })
            .Where(o => o.Items.Count > 0)
            .ToList();

        // Step 2: If resulting order list is empty
        if (filteredOrders.Count == 0)
            return BadRequest(new { code = "NO_NONZERO_ITEMS" });

        var batchDate = request.Date;

        // Step 3: Look up effective price for each item
        // Collect all unique product IDs
        var allProductIds = filteredOrders
            .SelectMany(o => o.Items.Select(i => i.ProductId))
            .Distinct()
            .ToList();

        // For each product, find the effective price on batchDate
        var priceMap = new Dictionary<int, decimal>();
        foreach (var productId in allProductIds)
        {
            var maxEffectiveFrom = await _context.ProductPrices
                .Where(pp => pp.ProductId == productId && pp.EffectiveFrom <= batchDate)
                .MaxAsync(pp => (DateOnly?)pp.EffectiveFrom);

            if (maxEffectiveFrom == null)
            {
                var productName = await _context.Products
                    .Where(p => p.ProductId == productId)
                    .Select(p => p.Name)
                    .FirstOrDefaultAsync() ?? productId.ToString();

                return BadRequest(new
                {
                    code = "NO_PRICE_FOR_DATE",
                    product = productName,
                    date = batchDate.ToString("yyyy-MM-dd")
                });
            }

            var unitPrice = await _context.ProductPrices
                .Where(pp => pp.ProductId == productId && pp.EffectiveFrom == maxEffectiveFrom)
                .Select(pp => pp.UnitPrice)
                .FirstAsync();

            priceMap[productId] = unitPrice;
        }

        // Step 4: Check for duplicate (date, driver_id, restaurant_id)
        var driverRestaurantPairs = filteredOrders
            .Select(o => new { o.DriverId, o.RestaurantId })
            .ToList();

        var duplicateRestaurantIds = new List<int>();
        foreach (var pair in driverRestaurantPairs)
        {
            bool isDuplicate = await _context.Orders.AnyAsync(o =>
                o.Date == batchDate &&
                o.DriverId == pair.DriverId &&
                o.RestaurantId == pair.RestaurantId);

            if (isDuplicate)
                duplicateRestaurantIds.Add(pair.RestaurantId);
        }

        if (duplicateRestaurantIds.Count > 0)
            return Conflict(new { code = "DUPLICATE_ORDER", restaurant_ids = duplicateRestaurantIds });

        // Step 5: Insert all orders in one transaction
        var createdOrders = new List<Order>();

        await using var transaction = await (_context as Microsoft.EntityFrameworkCore.DbContext)!
            .Database.BeginTransactionAsync();

        try
        {
            foreach (var orderEntry in filteredOrders)
            {
                var order = new Order
                {
                    Date = batchDate,
                    DriverId = orderEntry.DriverId,
                    RestaurantId = orderEntry.RestaurantId,
                    Items = orderEntry.Items.Select(i => new OrderItem
                    {
                        ProductId = i.ProductId,
                        QuantityKg = i.QuantityKg,
                        UnitPrice = priceMap[i.ProductId],
                        LineTotal = i.QuantityKg * priceMap[i.ProductId]
                    }).ToList()
                };

                _context.Orders.Add(order);
                createdOrders.Add(order);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Reload with navigation properties
        var createdOrderIds = createdOrders.Select(o => o.OrderId).ToList();
        var resultOrders = await _context.Orders
            .Include(o => o.Driver)
            .Include(o => o.Restaurant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Where(o => createdOrderIds.Contains(o.OrderId))
            .ToListAsync();

        return Ok(resultOrders.Select(MapOrder));
    }

    // PUT /api/v1/orders/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrderRequest request)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null)
            return NotFound();

        await using var transaction = await (_context as Microsoft.EntityFrameworkCore.DbContext)!
            .Database.BeginTransactionAsync();

        try
        {
            var newDate = request.Date ?? order.Date;
            bool dateChanged = newDate != order.Date;
            order.Date = newDate;

            // Remove existing items
            foreach (var item in order.Items.ToList())
                _context.OrderItems.Remove(item);

            // Add new items with re-snapshotted prices if date changed
            foreach (var itemEntry in request.Items.Where(i => i.QuantityKg != 0))
            {
                decimal unitPrice;

                if (dateChanged)
                {
                    var maxEffectiveFrom = await _context.ProductPrices
                        .Where(pp => pp.ProductId == itemEntry.ProductId && pp.EffectiveFrom <= newDate)
                        .MaxAsync(pp => (DateOnly?)pp.EffectiveFrom);

                    if (maxEffectiveFrom == null)
                        return BadRequest(new { message = $"No price found for product {itemEntry.ProductId} on {newDate:yyyy-MM-dd}." });

                    unitPrice = await _context.ProductPrices
                        .Where(pp => pp.ProductId == itemEntry.ProductId && pp.EffectiveFrom == maxEffectiveFrom)
                        .Select(pp => pp.UnitPrice)
                        .FirstAsync();
                }
                else
                {
                    // Keep existing snapshot if date didn't change - re-lookup for safety
                    var existingItem = order.Items.FirstOrDefault(i => i.ProductId == itemEntry.ProductId);
                    if (existingItem != null)
                    {
                        unitPrice = existingItem.UnitPrice;
                    }
                    else
                    {
                        var maxEffectiveFrom = await _context.ProductPrices
                            .Where(pp => pp.ProductId == itemEntry.ProductId && pp.EffectiveFrom <= newDate)
                            .MaxAsync(pp => (DateOnly?)pp.EffectiveFrom);

                        if (maxEffectiveFrom == null)
                            return BadRequest(new { message = $"No price found for product {itemEntry.ProductId} on {newDate:yyyy-MM-dd}." });

                        unitPrice = await _context.ProductPrices
                            .Where(pp => pp.ProductId == itemEntry.ProductId && pp.EffectiveFrom == maxEffectiveFrom)
                            .Select(pp => pp.UnitPrice)
                            .FirstAsync();
                    }
                }

                order.Items.Add(new OrderItem
                {
                    ProductId = itemEntry.ProductId,
                    QuantityKg = itemEntry.QuantityKg,
                    UnitPrice = unitPrice,
                    LineTotal = itemEntry.QuantityKg * unitPrice
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Reload with navigation properties
        var resultOrder = await _context.Orders
            .Include(o => o.Driver)
            .Include(o => o.Restaurant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        return Ok(MapOrder(resultOrder!));
    }

    // DELETE /api/v1/orders/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null)
            return NotFound();

        foreach (var item in order.Items.ToList())
            _context.OrderItems.Remove(item);

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
