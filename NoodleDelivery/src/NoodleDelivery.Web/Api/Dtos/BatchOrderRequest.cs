namespace NoodleDelivery.Web.Api.Dtos;

public class BatchOrderRequest
{
    public DateOnly Date { get; set; }
    public List<BatchOrderEntry> Orders { get; set; } = new();
}

public class BatchOrderEntry
{
    public int DriverId { get; set; }
    public int RestaurantId { get; set; }
    public List<BatchOrderItemEntry> Items { get; set; } = new();
}

public class BatchOrderItemEntry
{
    public int ProductId { get; set; }
    public decimal QuantityKg { get; set; }
}

public class UpdateOrderRequest
{
    public DateOnly? Date { get; set; }
    public List<UpdateOrderItemEntry> Items { get; set; } = new();
}

public class UpdateOrderItemEntry
{
    public int ProductId { get; set; }
    public decimal QuantityKg { get; set; }
}
