using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Infrastructure.Persistence.Configurations;

public class DriverConfiguration : IEntityTypeConfiguration<Driver>
{
    public void Configure(EntityTypeBuilder<Driver> builder)
    {
        builder.HasKey(d => d.DriverId);
        builder.Property(d => d.Name).HasMaxLength(100).IsRequired();
        builder.Property(d => d.Phone).HasMaxLength(20);
        builder.Property(d => d.IsActive).HasDefaultValue(true);
    }
}
