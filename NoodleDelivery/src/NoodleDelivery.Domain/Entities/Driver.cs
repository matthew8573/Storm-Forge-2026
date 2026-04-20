using NoodleDelivery.Domain.Common;

namespace NoodleDelivery.Domain.Entities;

public class Driver : AuditableEntity
{
    public int DriverId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
