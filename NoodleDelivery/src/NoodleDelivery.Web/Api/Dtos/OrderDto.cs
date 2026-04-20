namespace NoodleDelivery.Web.Api.Dtos;

public class OrderDto
{
    public int OrderId { get; set; }
    public DateOnly Date { get; set; }
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public int RestaurantId { get; set; }
    public string RestaurantName { get; set; } = string.Empty;
    public List<OrderItemDto> Items { get; set; } = new();
}

public class OrderItemDto
{
    public int OrderItemId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal QuantityKg { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
