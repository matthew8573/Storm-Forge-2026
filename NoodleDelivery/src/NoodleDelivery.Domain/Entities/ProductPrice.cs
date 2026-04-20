using NoodleDelivery.Domain.Common;

namespace NoodleDelivery.Domain.Entities;

public class ProductPrice : AuditableEntity
{
    public int PriceId { get; set; }
    public int ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public Product Product { get; set; } = null!;
}
