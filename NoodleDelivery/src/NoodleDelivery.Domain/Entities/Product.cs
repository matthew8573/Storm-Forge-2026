using NoodleDelivery.Domain.Common;

namespace NoodleDelivery.Domain.Entities;

public class Product : AuditableEntity
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public ICollection<ProductPrice> Prices { get; set; } = new List<ProductPrice>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
