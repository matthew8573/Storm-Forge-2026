using NoodleDelivery.Domain.Common;

namespace NoodleDelivery.Domain.Entities;

public class Order : AuditableEntity
{
    public int OrderId { get; set; }
    public DateOnly Date { get; set; }
    public int DriverId { get; set; }
    public int RestaurantId { get; set; }
    public Driver Driver { get; set; } = null!;
    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
