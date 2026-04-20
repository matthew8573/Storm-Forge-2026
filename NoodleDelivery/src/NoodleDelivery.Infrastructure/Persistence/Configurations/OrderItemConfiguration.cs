using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Infrastructure.Persistence.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(i => i.OrderItemId);
        builder.Property(i => i.QuantityKg).HasColumnType("decimal(6,2)").IsRequired();
        builder.Property(i => i.UnitPrice).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(i => i.LineTotal).HasColumnType("decimal(12,2)").IsRequired();
        builder.HasIndex(i => new { i.OrderId, i.ProductId }).IsUnique();
        builder.HasCheckConstraint("CK_OrderItem_QuantityKg", "quantity_kg >= 0 AND quantity_kg <= 1000000");
        builder.HasOne(i => i.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(i => i.Product)
            .WithMany(p => p.OrderItems)
            .HasForeignKey(i => i.ProductId);
    }
}
