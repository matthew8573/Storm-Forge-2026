using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.OrderId);
        builder.Property(o => o.Date).IsRequired();
        builder.HasIndex(o => new { o.Date, o.DriverId, o.RestaurantId }).IsUnique();
        builder.HasOne(o => o.Driver)
            .WithMany(d => d.Orders)
            .HasForeignKey(o => o.DriverId);
        builder.HasOne(o => o.Restaurant)
            .WithMany(r => r.Orders)
            .HasForeignKey(o => o.RestaurantId);
    }
}
