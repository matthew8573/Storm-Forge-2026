using NoodleDelivery.Domain.Common;

namespace NoodleDelivery.Domain.Entities;

public class Restaurant : AuditableEntity
{
    public int RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal PricePerKg { get; set; } = 0;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
